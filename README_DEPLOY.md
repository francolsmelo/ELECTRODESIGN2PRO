# 🚀 Guía de Deployment — ElectroDesign Pro

## Plataforma: Render.com (Opción A)

Render ofrece hosting gratuito para servicios web y sitios estáticos.
El proyecto usa **dos servicios**: un backend (FastAPI) y un frontend (React).

---

## Paso 1 — Preparar MongoDB Atlas

1. Ingresa a [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Crea un cluster gratuito (M0)
3. En **Database Access**: crea un usuario con contraseña
4. En **Network Access**: agrega `0.0.0.0/0` (permite acceso desde Render)
5. En **Connect → Drivers**: copia la cadena `mongodb+srv://...`

---

## Paso 2 — Hacer fork / tener el repo en GitHub

El código debe estar en tu cuenta de GitHub (ya lo tienes en `francolsmelo/ELECTRODESIGN2PRO`).

---

## Paso 3 — Desplegar el Backend en Render

1. Ve a [render.com](https://render.com) → **New → Web Service**
2. Conecta tu repositorio de GitHub
3. Configuración:
   - **Root Directory**: `backend`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn server:app --host 0.0.0.0 --port $PORT`
4. En **Environment Variables** agrega:

   | Variable | Valor |
   |---|---|
   | `MONGO_URL` | tu cadena de MongoDB Atlas |
   | `DB_NAME` | `electrodesign_db` |
   | `JWT_SECRET` | una cadena larga y aleatoria |
   | `EMERGENT_LLM_KEY` | tu API key de Emergent |
   | `PAYPAL_CLIENT_ID` | tu Client ID de PayPal |
   | `PAYPAL_SECRET` | tu Secret de PayPal |
   | `PAYPAL_MODE` | `sandbox` (o `live` en producción) |
   | `CORS_ORIGINS` | (dejar vacío por ahora, se actualiza en el Paso 5) |

5. Haz clic en **Create Web Service**
6. Espera que el deploy termine. Copia la URL del backend, ej:
   `https://electrodesign-backend.onrender.com`

---

## Paso 4 — Desplegar el Frontend en Render

1. En Render → **New → Static Site**
2. Conecta el mismo repositorio
3. Configuración:
   - **Root Directory**: `frontend`
   - **Build Command**: `yarn install && yarn build`
   - **Publish Directory**: `build`
4. En **Environment Variables** agrega:

   | Variable | Valor |
   |---|---|
   | `REACT_APP_BACKEND_URL` | URL del backend del Paso 3, ej: `https://electrodesign-backend.onrender.com` |

5. En **Redirects/Rewrites**, agrega una regla:
   - Source: `/*`
   - Destination: `/index.html`
   - Type: **Rewrite**

6. Haz clic en **Create Static Site**
7. Copia la URL del frontend, ej:
   `https://electrodesign-frontend.onrender.com`

---

## Paso 5 — Actualizar CORS en el Backend

1. Ve al servicio del backend en Render
2. En **Environment** actualiza:
   - `CORS_ORIGINS` → `https://electrodesign-frontend.onrender.com`
3. Render redeploya automáticamente

---

## Paso 6 — Verificar que todo funciona

Abre la URL del frontend en el navegador. Deberías ver la pantalla de login de ElectroDesign Pro.

Para verificar el backend directamente:
```
https://electrodesign-backend.onrender.com/api/health
```
Debe responder: `{"status": "ok"}`

---

## Notas importantes

- Los servicios gratuitos de Render **se duermen** tras 15 min de inactividad. La primera petición puede tardar ~30 segundos.
- Para evitar el sleep, considera el plan **Starter** ($7/mes por servicio).
- Nunca subas el archivo `.env` a GitHub — está en `.gitignore`.
