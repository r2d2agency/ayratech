# Stage 1: Build the React application
FROM node:20-alpine as build

WORKDIR /app

# Copy package.json files
COPY package.json ./
COPY apps/promoter-pwa/package.json ./apps/promoter-pwa/

# Install dependencies (ignoring scripts to avoid errors with potential missing dev dependencies)
RUN npm install --ignore-scripts

# Copy source code
COPY . .

# Build the project
WORKDIR /app/apps/promoter-pwa
RUN npm install
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine

# Copy built assets from builder stage
COPY --from=build /app/apps/promoter-pwa/dist /usr/share/nginx/html

# Copy custom nginx config
COPY apps/promoter-pwa/nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
