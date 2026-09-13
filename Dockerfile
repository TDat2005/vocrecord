FROM php:8.2-apache
LABEL Name=clonevocrecord Version=0.0.1
RUN docker-php-ext-install mysqli pdo pdo_mysql
RUN a2enmod rewrite
COPY . /var/www/html/
EXPOSE 80
