import os
import subprocess
import json
from pymongo import MongoClient
from pymongo.errors import PyMongoError

# Cambia estas variables según tu configuración:
MONGO_URI = "" #String de conexión a la base de datos MongoDB
DATA_DIR = "f1db-json-splitted"
MONGOIMPORT_PATH = r"E:\mongodb-database-tools-windows-x86_64-100.13.0\bin\mongoimport.exe"

def import_data(file_path, collection_name):
    """Importa datos JSON a MongoDB"""
    print(f"\n� Importando datos: {os.path.basename(file_path)} → colección {collection_name}")
    result = subprocess.run([
        MONGOIMPORT_PATH,
        "--uri", MONGO_URI,
        "--collection", collection_name,
        "--file", file_path,
        "--jsonArray",
        "--drop"
    ], capture_output=True, text=True)
    
    if result.returncode == 0:
        print(f"✅ Importación exitosa: {collection_name}")
        return True
    else:
        print(f"❌ Error al importar {collection_name}:")
        print(result.stderr)
        return False

def clean_schema(schema):
    """Limpia el schema eliminando palabras clave no soportadas por MongoDB"""
    # Palabras clave a eliminar
    keys_to_remove = ['$id', '$schema', 'title', 'description']
    
    if isinstance(schema, dict):
        # Eliminar las palabras clave no soportadas
        for key in keys_to_remove:
            schema.pop(key, None)
            
        # Procesar recursivamente los valores del diccionario
        for key, value in schema.items():
            schema[key] = clean_schema(value)
            
    elif isinstance(schema, list):
        # Procesar recursivamente los elementos de la lista
        schema = [clean_schema(item) for item in schema]
        
    return schema

def convert_integer_types(schema):
    """Convierte 'type': 'integer' en 'bsonType': 'int' para compatibilidad con MongoDB."""
    if isinstance(schema, dict):
        new_schema = {}
        for key, value in schema.items():
            if key == "type" and value == "integer":
                new_schema["bsonType"] = "int"
            else:
                new_schema[key] = convert_integer_types(value)
        return new_schema
    elif isinstance(schema, list):
        return [convert_integer_types(item) for item in schema]
    else:
        return schema

def remove_unsupported_keywords(schema):
    """Elimina keywords no soportados por MongoDB como 'format', 'default', 'examples', etc."""
    unsupported_keys = {"format", "default", "examples", "enum", "const"}  # puedes ampliar esta lista

    if isinstance(schema, dict):
        new_schema = {}
        for key, value in schema.items():
            if key not in unsupported_keys:
                new_schema[key] = remove_unsupported_keywords(value)
        return new_schema
    elif isinstance(schema, list):
        return [remove_unsupported_keywords(item) for item in schema]
    else:
        return schema


def convert_mixed_integer_types(schema):
    """Convierte correctamente los tipos 'integer' o listas que contengan 'integer'."""
    if isinstance(schema, dict):
        new_schema = {}
        for key, value in schema.items():
            if key == "type":
                # Caso simple
                if value == "integer":
                    new_schema["bsonType"] = "int"
                # Caso donde es lista de tipos: ["integer", "null"]
                elif isinstance(value, list):
                    if "integer" in value:
                        value = ["int" if v == "integer" else v for v in value]
                        new_schema["bsonType"] = value
                    else:
                        new_schema[key] = value
                else:
                    new_schema[key] = value
            else:
                new_schema[key] = convert_mixed_integer_types(value)
        return new_schema
    elif isinstance(schema, list):
        return [convert_mixed_integer_types(item) for item in schema]
    else:
        return schema

def resolve_refs(schema, definitions):
    """Reemplaza todas las referencias $ref dentro de un esquema usando el contenido de definitions."""
    if isinstance(schema, dict):
        if "$ref" in schema:
            ref = schema["$ref"]
            if ref.startswith("#/definitions/"):
                key = ref.split("/")[-1]
                return resolve_refs(definitions.get(key, {}), definitions)
        # Recorrer los subelementos
        return {k: resolve_refs(v, definitions) for k, v in schema.items()}
    elif isinstance(schema, list):
        return [resolve_refs(item, definitions) for item in schema]
    else:
        return schema

# Esta función se utiliza porque se espera Esquema raíz con "properties" 
# y los archivos tienen Esquema raíz con "type": "array" y "items": { "$ref": ... }"
# y tambien se validan Valida documentos tipo objeto ({ ... }) pero los archivos
# describen Describe una lista ([ { ... }, { ... } ])

def extract_object_schema(schema):
    """
    Extrae el esquema del objeto principal y resuelve referencias $ref.
    """
    definitions = schema.get("definitions", {})

    # Si el esquema principal es un array con un $ref, extraerlo
    if schema.get("type") == "array" and "items" in schema:
        items = schema["items"]
        if isinstance(items, dict) and "$ref" in items:
            ref = items["$ref"]
            if ref.startswith("#/definitions/"):
                def_name = ref.split("/")[-1]
                schema = definitions.get(def_name, {})

    # Resolver todas las referencias dentro del esquema
    schema = resolve_refs(schema, definitions)
    return schema



def apply_schema(collection_name, schema_path):
    """Aplica el esquema JSON como validador de la colección"""
    try:
        # Leemos el archivo de esquema
        with open(schema_path, 'r') as f:
            schema = json.load(f)
        
        # Limpiamos el schema
        cleaned_schema = clean_schema(schema)


        # 🔹 Extraemos el objeto real si el schema describe un array
        cleaned_schema = extract_object_schema(cleaned_schema)


        # 🔹 Convertimos los tipos 'integer' y combinaciones tipo ["integer", "null"]
        cleaned_schema = convert_mixed_integer_types(cleaned_schema)

        # 🔹 Eliminamos keywords no soportados como 'format', 'default', 'examples'
        cleaned_schema = remove_unsupported_keywords(cleaned_schema)



        
        # Nos aseguramos de que tengamos las propiedades requeridas para MongoDB
        if 'properties' not in cleaned_schema:
            print(f"⚠️ Schema inválido para {collection_name}: falta la sección 'properties'")
            return False
            
        # Conectamos a MongoDB
        client = MongoClient(MONGO_URI)
        db = client.get_default_database()
        
        # Convertimos el esquema JSON a formato de validador de MongoDB
        validator = {
            "$jsonSchema": cleaned_schema
        }
        
        # Aplicamos el validador a la colección
        db.command("collMod", collection_name, 
                  validator=validator,
                  validationLevel="moderate")
        
        print(f"✅ Schema aplicado a la colección: {collection_name}")
        return True
    except Exception as e:
        print(f"❌ Error al aplicar schema a {collection_name}:")
        print(str(e))
        return False
    finally:
        if 'client' in locals():
            client.close()

def main():
    print(f"🔄 Trabajando con la base de datos: TFG-TrabajoSSIIUU")
    print("=" * 50)
    
    # Si queremos solo validar los esquemas, comentar toda esta seccion hasta abajo (indicare hasta donde)
    """
    print("\n📥 Importando datos")
    print("=" * 50)
    
    # Importar todos los datos
    for file in os.listdir(DATA_DIR):
        if file.endswith(".json") and not file.endswith(".schema.json"):
            collection = os.path.splitext(file)[0].replace("f1db-", "")
            file_path = os.path.join(DATA_DIR, file)
            import_data(file_path, collection)
    """
    # hasta aqui comentar si solo queremos validar esquemas


    
    print("\n📋 Aplicando esquemas de validación")
    print("=" * 50)
    
    # Aplicar los esquemas de validación
    for file in os.listdir(DATA_DIR):
        if file.endswith(".schema.json"):
            collection = os.path.splitext(file)[0].replace("f1db-", "").replace(".schema", "")
            schema_path = os.path.join(DATA_DIR, file)
            print(f"\n📋 Procesando schema para la colección: {collection}")

            # Caso especial: races-free-practice-results aplica a 4 colecciones, porque hay un esquema para las 4 free practice
            if collection == "races-practice-results":
                for i in range(1, 5):
                    sub_collection = f"races-free-practice-{i}-results"
                    print(f"↳ Aplicando también a {sub_collection}")
                    apply_schema(sub_collection, schema_path)
            else:
                apply_schema(collection, schema_path)


if __name__ == "__main__":
    main()
