# AgroMaq — Sistema de Gestión Comercial y Operativa

ERP ligero para empresas de venta de maquinaria y herramientas agrícolas.

## Stack Tecnológico

- **Backend:** Node.js + Express + PostgreSQL + Prisma ORM
- **Frontend:** React + Vite + TailwindCSS + shadcn/ui
- **Auth:** JWT con roles (Admin, Vendedor, Almacenista, Repartidor)
- **Arquitectura:** Monorepo (`/client` + `/server`)

---

## Instalación rápida

### 1. Requisitos previos
- Node.js 18+
- Docker + Docker Compose
- Git

### 2. Levantar base de datos

```bash
docker compose up -d
```

Esto levanta PostgreSQL en el puerto `5432` y Redis en `6379`.

### 3. Configurar variables de entorno

```bash
# Ya existe una copia en server/.env
# Edítala si necesitas cambiar configuración
```

### 4. Instalar dependencias del servidor

```bash
cd server
npm install
```

### 5. Crear tablas y cargar datos de prueba

```bash
cd server
npx prisma db push
node prisma/seed.js
```

El seed crea:
- 20 productos (STIHL, Husqvarna, John Deere, Kubota, Honda, etc.)
- 8 categorías (motosierras, fumigadoras, tractores, riego, etc.)
- 9 marcas
- 5 clientes de ejemplo
- 3 proveedores
- 3 usuarios

### 6. Instalar dependencias del cliente

```bash
cd client
npm install
```

### 7. Iniciar la aplicación

Desde la raíz del proyecto:

```bash
npm install
npm run dev
```

O por separado:
```bash
# Terminal 1 - Backend
cd server && npm run dev

# Terminal 2 - Frontend  
cd client && npm run dev
```

La app estará disponible en:
- Frontend: http://localhost:5173
- API: http://localhost:3001/api

---

## Credenciales de prueba

| Usuario | Email | Password | Rol |
|---------|-------|----------|-----|
| Administrador | admin@agromaq.mx | admin123 | ADMIN |
| Vendedor | ventas@agromaq.mx | vendedor123 | VENDEDOR |
| Almacenista | almacen@agromaq.mx | vendedor123 | ALMACENISTA |

---

## Módulos incluidos

| Módulo | Estado |
|--------|--------|
| Dashboard con KPIs | ✅ |
| Catálogo de Productos | ✅ |
| Inventario Multi-almacén | ✅ |
| Ventas Multicanal | ✅ |
| Cotizaciones | ✅ |
| Clientes (CRM básico) | ✅ |
| Proveedores | ✅ |
| Órdenes de Compra | ✅ |
| Logística y Entregas | ✅ |
| Caja y Finanzas | ✅ |
| Reportes y Analytics | ✅ |
| Configuración | ✅ |

---

## Variables de entorno

```env
# Base de datos
DATABASE_URL="postgresql://agricola:agricola123@localhost:5432/sistema_agricola"

# JWT
JWT_SECRET=your_super_secret_key_here
JWT_EXPIRES_IN=7d

# Servidor
PORT=3001
NODE_ENV=development

# WhatsApp (Twilio)
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886

# Mercado Libre
ML_CLIENT_ID=your_ml_client_id
ML_CLIENT_SECRET=your_ml_client_secret
```

---

## Estructura del proyecto

```
sistema-agricola/
├── client/                  # React + Vite frontend
│   ├── src/
│   │   ├── components/      # UI components (shadcn/ui)
│   │   ├── pages/           # Módulos de la aplicación
│   │   ├── store/           # Zustand (auth, toasts)
│   │   └── lib/             # utils, api client
│   └── package.json
├── server/                  # Node.js + Express backend
│   ├── prisma/
│   │   ├── schema.prisma    # Modelos de BD
│   │   └── seed.js          # Datos de prueba
│   ├── src/
│   │   ├── middleware/      # Auth JWT
│   │   ├── routes/          # API endpoints
│   │   └── lib/             # Prisma client
│   └── package.json
├── docker-compose.yml       # PostgreSQL + Redis
├── .env.example             # Variables de entorno
└── package.json             # Monorepo root
```

---

## Canales de venta soportados

- Tienda física
- Mercado Libre
- Amazon
- WhatsApp
- Sitio web propio

## Precios

Todos los precios se manejan en **MXN (Pesos Mexicanos)**.
