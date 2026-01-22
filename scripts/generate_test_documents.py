#!/usr/bin/env python3
"""
Script para generar 3.000 documentos de prueba en el espacio Albaranes Entrada Bascula
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import uuid
from datetime import datetime, timezone, timedelta
import random
import os
import sys

# Configuración
WORKSPACE_ID = "db3759ca-ba34-4239-adf4-bf860dca3a28"
TOTAL_DOCUMENTS = 3000
BATCH_SIZE = 100

# URLs de PDFs externos (rotando entre estas 3)
PDF_URLS = [
    "https://www.hcostadealmeria.net/alb/Alb5633.pdf",
    "https://www.hcostadealmeria.net/alb/Alb5634.pdf",
    "https://www.hcostadealmeria.net/alb/Alb5635.pdf"
]

# Datos aleatorios para metadatos
AGRICULTORES = [
    "AGRO LOYOR SL", "FRUTAS DEL SUR SA", "HORTALIZAS COSTA SL",
    "INVERNADEROS ALMERIA SL", "PRODUCTOS AGRÍCOLAS SA", "CULTIVOS SOSTENIBLES SL",
    "HORTICOLA MEDITERRÁNEA SL", "AGROPECUARIA COSTA SA", "VERDURAS FRESCAS SL",
    "CAMPO VERDE SL", "COSECHA DIRECTA SA", "HUERTA NATURAL SL",
    "TOMATES DEL MAR SL", "PEPINOS COSTA SL", "LECHUGAS PREMIUM SA",
    "BERENJENAS SELECTAS SL", "CALABACINES FRESCOS SA", "PIMIENTOS DEL SOL SL"
]

CATEGORIAS = [
    "Entrada", "Salida", "Traspaso", "Devolución", "Incidencia"
]

async def generate_documents():
    """Genera los documentos en la base de datos"""
    
    # Conectar a MongoDB
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    db_name = os.environ.get('DB_NAME', 'test_database')
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    print(f"🔄 Generando {TOTAL_DOCUMENTS} documentos en lotes de {BATCH_SIZE}...")
    print(f"📦 Workspace: {WORKSPACE_ID}")
    print(f"🌐 URLs: {len(PDF_URLS)} PDFs diferentes")
    print()
    
    documents_created = 0
    start_date = datetime.now(timezone.utc) - timedelta(days=365)  # Último año
    
    for batch_num in range(0, TOTAL_DOCUMENTS, BATCH_SIZE):
        batch = []
        batch_size = min(BATCH_SIZE, TOTAL_DOCUMENTS - batch_num)
        
        for i in range(batch_size):
            doc_number = batch_num + i + 1
            
            # Generar fecha aleatoria en el último año
            random_days = random.randint(0, 365)
            doc_date = start_date + timedelta(days=random_days)
            
            # Seleccionar datos aleatorios
            agricultor = random.choice(AGRICULTORES)
            categoria = random.choice(CATEGORIAS)
            codigo_agricultor = random.randint(10000, 99999)
            numero_albaran = f"{random.randint(1, 9999)}-{random.randint(1000, 9999)}"
            pdf_url = random.choice(PDF_URLS)
            
            # Crear documento
            document = {
                "id": str(uuid.uuid4()),
                "workspace_id": WORKSPACE_ID,
                "file_path": pdf_url,
                "file_name": f"Alb{doc_number}-{codigo_agricultor}.pdf",
                "public_url": str(uuid.uuid4()),
                "metadata": {
                    "Categoría": categoria,
                    "Fecha": doc_date.strftime("%Y-%m-%d"),
                    "Agricultor": agricultor,
                    "Codigo agricultor": str(codigo_agricultor),
                    "Numero Albaran": numero_albaran
                },
                "created_at": doc_date.isoformat(),
                "updated_at": doc_date.isoformat()
            }
            
            batch.append(document)
        
        # Insertar lote
        if batch:
            await db.documents.insert_many(batch)
            documents_created += len(batch)
            progress = (documents_created / TOTAL_DOCUMENTS) * 100
            print(f"✅ Lote {batch_num // BATCH_SIZE + 1}: {documents_created}/{TOTAL_DOCUMENTS} documentos ({progress:.1f}%)")
    
    print()
    print(f"🎉 ¡Completado! {documents_created} documentos creados exitosamente")
    
    # Mostrar estadísticas
    total_docs = await db.documents.count_documents({"workspace_id": WORKSPACE_ID})
    print(f"📊 Total de documentos en el espacio: {total_docs}")
    
    client.close()

if __name__ == "__main__":
    # Cargar variables de entorno
    from pathlib import Path
    from dotenv import load_dotenv
    
    env_path = Path(__file__).parent / '.env'
    load_dotenv(env_path)
    
    # Ejecutar generación
    asyncio.run(generate_documents())
