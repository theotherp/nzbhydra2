#!/usr/bin/env bash

#
#  (C) Copyright 2022 TheOtherP (theotherp@posteo.net)
#
#  Licensed under the Apache License, Version 2.0 (the "License");
#  you may not use this file except in compliance with the License.
#  You may obtain a copy of the License at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
#  Unless required by applicable law or agreed to in writing, software
#  distributed under the License is distributed on an "AS IS" BASIS,
#  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
#  See the License for the specific language governing permissions and
#  limitations under the License.
#

if [ -f ../data/database/nzbhydra.mv.db ]; then
    echo "../data/database/nzbhydra.mv.db found - switching to that directory"
    cd ../data/database/ || exit
fi

if [ ! -f nzbhydra.mv.db ]; then
    echo "nzbhydra.mv.db not found - please call this script from the database directory which contains that file."
    exit 0
fi

read -p "Please make a backup of the database file (nzbhydra.mv.db) before continuing"

if [ -f oldDbScript.zip ]; then
    echo "Deleting file oldDbScript.zip"
    rm -f oldDbScript.zip
fi


URL=jdbc:h2:file:./nzbhydra

VERSION=$(LC_ALL=C awk '{print substr($0,71,1)}' RS= nzbhydra.mv.db)
if [ "$VERSION" == "2" ]
        then
        echo "Database seems to be already upgraded"
        exit
fi

VERSION=$(LC_ALL=C awk '{print substr($0,64,1)}' RS= nzbhydra.mv.db)
if [ "$VERSION" != "1" ]
        then
        echo "Database has unexpected version"
        exit
fi


if [ ! -f h2-1.4.200.jar ]; then
    echo "Downloading h2-1.4.200.jar"
    wget https://repo1.maven.org/maven2/com/h2database/h2/1.4.200/h2-1.4.200.jar -nv
    if [ $? -eq 0 ]
        then
        echo "Successfully downloaded h2-1.4.200.jar"
    else
        echo "Error downloading h2-1.4.200.jar" >&2
        exit
    fi
fi



if [ ! -f h2-2.1.214.jar ]; then
    echo "Downloading h2-2.1.214.jar"
    wget https://repo1.maven.org/maven2/com/h2database/h2/2.1.214/h2-2.1.214.jar -nv
    if [ $? -eq 0 ]
        then
          echo "Successfully downloaded h2-2.1.214.jar"
        else
          echo "Error downloading h2-2.1.214.jar" >&2
          exit
    fi
fi


echo "Writing old database version to file oldDbScript.zip"
java -cp h2-1.4.200.jar org.h2.tools.Script -url $URL -user sa -script oldDbScript.zip -options compression zip
if [ ! $? -eq 0 ]
      then
      echo "Error writing old database version" >&2
      exit
fi

echo "Removing old database file"
rm nzbhydra.mv.db
if [ ! $? -eq 0 ]
      then
      echo "Error removing old database file" >&2
      exit
fi

echo "Creating new database version from file oldDbScript.zip"
java -cp h2-2.1.214.jar org.h2.tools.RunScript -url $URL -user sa -script oldDbScript.zip -options compression zip
if [ $? -eq 0 ]
    then
        rm h2-1.4.200.jar
        rm h2-2.1.214.jar
        rm oldDbScript.zip
      echo "Successfully created new database version"
fi
