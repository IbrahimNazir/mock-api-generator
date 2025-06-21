const axios = require('axios');

class ServerPinger {
  constructor({ url, intervalMinutes = 5 }) {
    if (!url) throw new Error("URL is required");

    this.url = url;
    this.intervalMs = intervalMinutes * 60 * 1000;
    this.timer = null;
  }

  start() {
    console.log(`Starting pinging every ${this.intervalMs / 1000}s to ${this.url}`);
    this.ping();
    this.timer = setInterval(() => this.ping(), this.intervalMs);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      console.log("Stopped pinging server.");
    }
  }

  async ping() {
    try {
      const res = await axios.get(`${this.url}`);
      console.log(`Pinged ${this.url} - Status: ${res.status}`);
    } catch (err) {
      console.error(`Failed to ping ${this.url}: ${err.message}`);
    }
  }
}

module.exports = ServerPinger;
