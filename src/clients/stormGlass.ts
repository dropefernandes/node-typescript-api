import config, { IConfig } from 'config'

import { InternalError } from '@src/util/errors/internal-error'
import * as HTTPUtil from '@src/util/request'

export interface StormGlassPointSource {
  [key: string]: number
}

export interface StormGlassPoint {
  time: string
  readonly waveHeight: StormGlassPointSource
  readonly waveDirection: StormGlassPointSource
  readonly swellDirection: StormGlassPointSource
  readonly swellHeight: StormGlassPointSource
  readonly swellPeriod: StormGlassPointSource
  readonly windDirection: StormGlassPointSource
  readonly windSpeed: StormGlassPointSource
}

export interface StormGlassForecastResponse {
  hours: StormGlassPoint[]
}

export interface ForecastPoint {
  time: string
  waveHeight: number
  waveDirection: number
  swellDirection: number
  swellHeight: number
  swellPeriod: number
  windDirection: number
  windSpeed: number
}

export class ClientRequestError extends InternalError {
  constructor(message: string) {
    const internalMessage = 'Unexpected error when trying to comunicate to StormGlass'
    super(`${internalMessage}: ${message}`)
  }
}

export class StormGlassResponseError extends InternalError {
  constructor(message: string) {
    const internalMessage = 'Unexpected error returned by the StormGlass service'
    super(`${internalMessage}: ${message}`)
  }
}

const stormGlassResourceConfig: IConfig = config.get(
  'App.resources.StormGlass'
)

export class StormGlass {
  readonly stormGlassAPIParams =
    'swellDirection,swellHeight,swellPeriod,waveDirection,waveHeight,windDirection,windSpeed'
  readonly StormGlassAPISource = 'noaa'

  constructor (protected request = new HTTPUtil.Request()) {}

  public async fetchPoints(lat: number, lng: number): Promise<ForecastPoint[]> {
    try {
      
      const response = await this.request.get<StormGlassForecastResponse>(
        `${stormGlassResourceConfig.get('apiUrl')}/weather/point?lat=${lat}&lng=${lng}&params=${this.stormGlassAPIParams}&source=${this.StormGlassAPISource}`,
        {
          headers: {
            Authorization: stormGlassResourceConfig.get('apiToken'),
          },
        }
      )
      return this.normalizeRepsonse(response.data)
    } catch (err) {
      if (HTTPUtil.Request.isRequestError(err)) {
        throw new StormGlassResponseError(`Error: ${JSON.stringify(err.response.data)} Code: ${err.response.status}`)
      }
      throw new ClientRequestError(err.message)
    }

  }

  private normalizeRepsonse (
    points: StormGlassForecastResponse
    ): ForecastPoint[] {
    return points.hours.filter(this.isValidPoint.bind(this)).map((point) => ({
      swellDirection: point.swellDirection[this.StormGlassAPISource],
      swellHeight: point.swellHeight[this.StormGlassAPISource],
      swellPeriod: point.swellPeriod[this.StormGlassAPISource],
      time: point.time,
      waveDirection: point.waveDirection[this.StormGlassAPISource],
      waveHeight: point.waveHeight[this.StormGlassAPISource],
      windDirection: point.windDirection[this.StormGlassAPISource],
      windSpeed: point.windSpeed[this.StormGlassAPISource],
    }))
  }

  private isValidPoint (point: Partial<StormGlassPoint>): boolean {
    return !!(
      point.time &&
      point.swellDirection?.[this.StormGlassAPISource] &&
      point.swellHeight?.[this.StormGlassAPISource] &&
      point.swellPeriod?.[this.StormGlassAPISource] &&
      point.waveDirection?.[this.StormGlassAPISource] &&
      point.waveHeight?.[this.StormGlassAPISource] &&
      point.windDirection?.[this.StormGlassAPISource] &&
      point.windSpeed?.[this.StormGlassAPISource]
    )
  }
}