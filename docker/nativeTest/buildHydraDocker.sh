cp ../../core/target/core .
cp ../../other/wrapper/nzbhydra2wrapperPy3.py .
cp ../../tests/system/src/test/resources/initialNzbhydra.yml ./nzbhydra.yml
docker build -t hydradocker .
