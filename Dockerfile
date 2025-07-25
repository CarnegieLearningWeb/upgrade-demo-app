# Use an official Node.js runtime as the base image
ARG IMAGE_REPO
FROM ${IMAGE_REPO:-public.ecr.aws/docker/library/node}:22.14-alpine

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install the application dependencies
RUN npm install

# Copy the rest of the application code to the working directory
COPY . .

# Expose the port the app runs on
EXPOSE 8080

# Define the command to run the application
CMD ["node", "--no-deprecation", "server.js"]