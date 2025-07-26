# Use an official Node.js runtime as a parent image
FROM node:18

# Create app directory in the container
WORKDIR /workspaces/${localWorkspaceFolderBasename}

# Install app dependencies
COPY package*.json ./
RUN npm install

# Bundle app source
COPY . .

# Expose the port your app uses
EXPOSE 3000

# Default command
CMD ["npm", "run", "dev"]