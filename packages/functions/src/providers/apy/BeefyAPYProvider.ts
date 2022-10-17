import { PluginData, Strategy } from '@midas-capital/types';
import axios from 'axios';
import { ExternalAPYProvider } from './ExternalAPYProvider';

interface BeefyAPYResponse {
  [key: string]: number;
}

class BeefyAPYProvider extends ExternalAPYProvider {
  static apyEndpoint = 'https://api.beefy.finance/apy';
  private beefyAPYs: BeefyAPYResponse | undefined;

  constructor() {
    super();
  }

  async getApy(pluginAddress: string, pluginData: PluginData): Promise<number> {
    if (pluginData.strategy != Strategy.Beefy)
      throw `BeefyAPYProvider: Not a Beefy Plugin ${pluginAddress}`;

    if (!pluginData.apyDocsUrl) throw 'BeefyAPYProvider: `apyDocsUrl` is required to map Beefy APY';

    const beefyID = pluginData.apyDocsUrl.split('/').pop();
    if (!beefyID) throw 'BeefyAPYProvider: unable to extract `Beefy ID` from `apyDocsUrl`';

    if (!this.beefyAPYs) {
      await this._fetchBeefyAPYs();
    }

    const apy = this.beefyAPYs![beefyID];
    if (!apy) throw `BeefyAPYProvider: Beefy ID: "${beefyID}" not included in Beefy APY data`;

    return apy;
  }

  private async _fetchBeefyAPYs() {
    this.beefyAPYs = await (await axios.get(BeefyAPYProvider.apyEndpoint)).data;
    if (!this.beefyAPYs) {
      throw `BeefyAPYProvider: unexpected Beefy APY response`;
    }
  }
}

export default new BeefyAPYProvider();