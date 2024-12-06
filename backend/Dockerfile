# Usa uma imagem Node.js
FROM node:20.18-slim

# Define o diretório de trabalho
WORKDIR /usr/src/app

# Copia os arquivos de configuração
COPY package*.json ./

# Instala as dependências
RUN yarn 

# Copia o restante do código
COPY . .

# Expõe a porta do NestJS
EXPOSE 3000

# Comando padrão para iniciar a aplicação
CMD ["npm", "run", "start:dev"]
