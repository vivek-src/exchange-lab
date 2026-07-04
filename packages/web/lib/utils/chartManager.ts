import {
  CandlestickSeries,
  ColorType,
  createChart,
  CrosshairMode,
  IChartApi,
  ISeriesApi,
  Time,
  UTCTimestamp,
} from "lightweight-charts";

export interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface CandleUpdate {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface ChartTheme {
  background: string;
  textColor: string;
}

export class ChartManager {
  private chart: IChartApi;
  private candleSeries: ISeriesApi<"Candlestick", Time>;

  constructor(
    container: HTMLElement,
    initialData: Candle[],
    theme: ChartTheme,
  ) {
    this.chart = createChart(container, {
      autoSize: true,

      layout: {
        background: {
          type: ColorType.Solid,
          color: theme.background,
        },
        textColor: theme.textColor,
      },

      crosshair: {
        mode: CrosshairMode.Normal,
      },

      grid: {
        vertLines: {
          visible: false,
        },
        horzLines: {
          visible: false,
        },
      },

      rightPriceScale: {
        visible: true,
        ticksVisible: true,
        entireTextOnly: true,
      },

      overlayPriceScales: {
        ticksVisible: true,
        borderVisible: true,
      },
    });

    this.candleSeries = this.chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderVisible: false,
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
    });

    this.setData(initialData);

    this.chart.timeScale().fitContent();
  }

  private transformCandle(candle: Candle) {
    return {
      time: (candle.timestamp / 1000) as UTCTimestamp,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
    };
  }

  public setData(data: Candle[]) {
    this.candleSeries.setData(
      data.map((candle) => this.transformCandle(candle)),
    );
  }

  public update(candle: CandleUpdate) {
    this.candleSeries.update({
      time: (candle.timestamp / 1000) as UTCTimestamp,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
    });
  }

  public fitContent() {
    this.chart.timeScale().fitContent();
  }

  public applyTheme(theme: ChartTheme) {
    this.chart.applyOptions({
      layout: {
        background: {
          type: ColorType.Solid,
          color: theme.background,
        },
        textColor: theme.textColor,
      },
    });
  }

  public resize(width: number, height: number) {
    this.chart.resize(width, height);
  }

  public destroy() {
    this.chart.remove();
  }
}
