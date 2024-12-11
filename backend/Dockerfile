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

# Builda a aplicação
RUN yarn build

# Expõe a porta do NestJS
EXPOSE 3001

# Comando padrão para iniciar a aplicação
CMD ["yarn", "start:dev"]
