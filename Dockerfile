# Imagen oficial ligera de Node
FROM node:22-alpine

# Crear directorio de trabajo
WORKDIR /app

# Copiar package.json primero (mejor cache)
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar todo el proyecto
COPY . .

# Exponer el puerto (Koyeb usa variable PORT)
EXPOSE 5000

# Comando para iniciar
CMD ["node", "index.js"]
