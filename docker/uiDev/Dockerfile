## Run from root folder (which contains core,misc, etc)
# alpine doesn't work because we need libgc for the native image
FROM ubuntu:22.04
LABEL org.opencontainers.image.source="https://github.com/theotherp/nzbhydra2/"
WORKDIR /app

RUN apt-get update
RUN apt-get install -y curl gnupg python3 unzip git openjdk-21-jdk

# Install nodeJS
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
RUN apt-get install -y nodejs


COPY core/*.json /app/
COPY core/.bowerrc /app/
COPY core/*.js /app/
# Must run after copying the files so that package.json and bower.json exist
RUN npm install -y --allow-root

# Something is wrong with the bower_components if installed this ways. It works on my machine so we just use those files -.-
# RUN /app/node_modules/.bin/bower install -y --allow-root
COPY core/bower_components/ /app/bower_components/

# Copy to a temp folder as a base. The start script will check if the ui-src folder to use is filled and if not copy from here
COPY core/ui-src/ /ui-src/

# RUN for file in releases/linux-amd64-release/target/*.zip; do unzip "$file" -d /app; done
RUN curl -L -o repo.zip https://github.com/theotherp/nzbhydra2/releases/download/v6.2.1/nzbhydra2-6.2.1-generic.zip && \
    unzip repo.zip -d /app && \
    rm repo.zip \

# Use the latest built binary so any updates we've made for this container to work are included
RUN rm -f /app/lib/*.jar
COPY core/target/*-exec.jar /app/lib/
COPY docker/uiDev/start.sh /
RUN chmod +x /start.sh
CMD ["/start.sh"]