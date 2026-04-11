# ElectroDesign Pro

## Project Structure

```
/
├── backend/    # FastAPI backend (Python)
└── frontend/   # React frontend (Node.js)
```

> **Deployment note:** The React frontend is located inside the `/frontend` directory.
> When deploying to Render (or any other platform), set the **Root Directory** to `frontend`
> and use `npm install && npm run build` as the build command.
> See `render.yaml` and `README_DEPLOY.md` for the full deployment configuration.
