FROM php:8.4-fpm-alpine

# Extensions système
RUN apk add --no-cache \
    icu-dev \
    libpq-dev \
    linux-headers \
    zip \
    unzip \
    git \
    curl

# Extensions PHP
RUN docker-php-ext-install \
    intl \
    pdo_pgsql \
    opcache

# Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# Répertoire de travail
WORKDIR /var/www/api

# Copier les fichiers composer en premier (cache Docker)
COPY composer.json composer.lock* ./

# Installer les dépendances (sans scripts pour le build)
RUN composer install --no-dev --no-scripts --no-autoloader --prefer-dist 2>/dev/null || true

# Copier le reste du code
COPY . .

# Finaliser l'autoloader
RUN if [ -f composer.lock ]; then \
        composer dump-autoload --optimize; \
    fi

# Permissions
RUN chown -R www-data:www-data /var/www/api/var 2>/dev/null || true

EXPOSE 9000

CMD ["php-fpm"]
