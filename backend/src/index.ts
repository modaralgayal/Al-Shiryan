import 'dotenv/config';
import { createApp } from './core/bootstrap';
import { config } from './core/config';

createApp().listen(config.port(), () => {
  console.log(`AORTAIQ backend listening on :${config.port()}`);
});
