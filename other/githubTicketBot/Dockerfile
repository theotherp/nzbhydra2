FROM python:3.12-slim

RUN useradd --create-home --uid 1000 ticketbot
WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY ticketbot/ ./ticketbot/
COPY prompts/ ./prompts/

ENV BOT_STATE_FILE=/data/state.json
# Must exist and be owned by the app user before VOLUME, so a fresh named
# volume is writable. A bind mount (./state) keeps the host's ownership
# instead: make that directory writable by uid 1000.
RUN mkdir -p /data && chown ticketbot:ticketbot /data
VOLUME ["/data"]

USER ticketbot

ENTRYPOINT ["python", "-m", "ticketbot"]
