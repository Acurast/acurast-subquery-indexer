FROM node:22 as build

RUN mkdir /app
WORKDIR /app

# copy src
COPY . /app/

# install dependencies
RUN yarn install

# Run the build script.
RUN yarn build

# Expose the port that the application listens on.
EXPOSE 3000

ENV NODE_ENV production
ENV TZ UTC
ENV NODE_OPTIONS=--max-old-space-size=1536

# Run the application.
CMD yarn start
