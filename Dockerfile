  
FROM node:latest

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

COPY package.json /usr/src/app

ADD wait-for-it.sh /usr/src/app/wait-for-it.sh
RUN chmod +x wait-for-it.sh

RUN npm install

COPY ./src /usr/src/app

EXPOSE 8080