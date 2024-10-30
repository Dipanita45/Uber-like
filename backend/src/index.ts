import 'reflect-metadata';
import dotenv from 'dotenv';
dotenv.config();
import { createConnection } from 'typeorm';
import { ApolloServer } from 'apollo-server-express';
import express from 'express';
import helmet from 'helmet';
import { buildSchema } from 'type-graphql'; // Correctly import buildSchema
import { createClient } from 'redis'; // Updated import for Redis
import { KafkaClient, Producer } from 'kafka-node';
import { UserResolver } from './resolvers/UserResolver';
import { TripResolver } from './resolvers/TripResolver';
import routeService from './services/route'; // Import the route service

const startServer = async () => {
  const app = express();
  app.use(helmet());

  const schema = await buildSchema({
    resolvers: [UserResolver, TripResolver],
  });

  const server = new ApolloServer({ schema });
  server.applyMiddleware({ app });

  // Backend WebSocket setup with Socket.IO
  const io = require("socket.io")(server, {
    cors: {
      origin: "http://localhost:8080",
      methods: ["GET", "POST"],
    },
  });

  app.use("/api/v1", routeService); // Use the imported route service

  try {
    await createConnection();
    console.log('Connected to the database');

    const redisClient = createClient({
      socket: {
        host: 'redis-server',
        port: 6379,
      },
    });

    redisClient.on('connect', () => {
      console.log('Connected to Redis');
    });

    const kafkaClient = new KafkaClient({ kafkaHost: 'localhost:9092' });
    const producer = new Producer(kafkaClient);
    
    producer.on('ready', () => {
      console.log('Kafka Producer is connected and ready.');
    });

    app.listen({ port: 8080 }, () =>
      console.log(
        `Server ready at http://localhost:8080${server.graphqlPath}`,
      ),
    );
  } catch (error) {
    console.error('Error starting the server:', error);
  }
};

startServer();
