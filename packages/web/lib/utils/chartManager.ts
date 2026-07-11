import {
  CandlestickSeries,
  ColorType,
  createChart,
  CrosshairMode,
  IChartApi,
  ISeriesApi,
  Time,
  UTCTimestamp,
  HistogramSeries,
} from "lightweight-charts";

export interface Candle {
  timestamp: number; // ms since epoch
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface ChartTheme {
  background: string;
  textColor: string;
}

export class ChartManager {
  private chart: IChartApi;
  private candleSeries: ISeriesApi<"Candlestick", Time>;
  private volumeSeries: ISeriesApi<"Histogram", Time>;

  constructor(
    container: HTMLElement,
    initialData: Candle[],
    theme: ChartTheme,
  ) {
    this.chart = createChart(container, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: theme.background },
        textColor: theme.textColor,
        fontSize: 11,
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      },
      localization: {
        locale: undefined, // uses browser locale, or set e.g. "en-IN"
        timeFormatter: (time: UTCTimestamp) => {
          return new Date(time * 1000).toLocaleString(undefined, {
            hour: "2-digit",
            minute: "2-digit",
            day: "2-digit",
            month: "short",
          });
        },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          width: 1,
          color: "#4c525e",
          style: 3,
          labelBackgroundColor: "#2a2e39",
        },
        horzLine: {
          width: 1,
          color: "#4c525e",
          style: 3,
          labelBackgroundColor: "#2a2e39",
        },
      },
      grid: {
        horzLines: { color: "#2d2e33", style: 2 },
        vertLines: { color: "#2d2e33", style: 2 },
      },
      rightPriceScale: {
        visible: true,
        autoScale: true,
        entireTextOnly: true,
        borderVisible: true,
        borderColor: "#2a2e39",
        scaleMargins: { top: 0.1, bottom: 0.22 }, // leave room for volume pane below
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,

        tickMarkFormatter: (time: UTCTimestamp, tickMarkType, locale) => {
          return new Date(time * 1000).toLocaleString(undefined, {
            hour: "2-digit",
            minute: "2-digit",
          });
        },
      },
    });

    this.candleSeries = this.chart.addSeries(CandlestickSeries, {
      upColor: "#039d63",
      downColor: "#ce484b",
      borderVisible: true,
      wickUpColor: "#039d63",
      wickDownColor: "#ce484b",
      priceFormat: { type: "price", precision: 2, minMove: 0.01 },
    });

    this.volumeSeries = this.chart.addSeries(HistogramSeries, {
      priceScaleId: "volume-pane",
      priceFormat: { type: "volume" },
    });

    this.chart.priceScale("volume-pane").applyOptions({
      scaleMargins: { top: 0.82, bottom: 0.05 },
    });

    this.setData(initialData);
    this.chart.timeScale().fitContent();
  }

  private transformData(candle: Candle) {
    const time = Math.floor(candle.timestamp / 1000) as UTCTimestamp;

    const isUpCandle = candle.close >= candle.open;

    return {
      candlePoint: {
        time,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
      },
      volumePoint: {
        time,
        value: candle.volume,
        color: isUpCandle
          ? "rgba(38, 166, 154, 0.25)"
          : "rgba(239, 83, 80, 0.25)",
      },
    };
  }

  public setData(data: Candle[]) {
    const candleData: any[] = [];
    const volumeData: any[] = [];

    for (const item of data) {
      const { candlePoint, volumePoint } = this.transformData(item);
      candleData.push(candlePoint);
      volumeData.push(volumePoint);
    }

    this.candleSeries.setData(candleData);
    this.volumeSeries.setData(volumeData);
  }

  public update(candle: Candle) {
    const { candlePoint, volumePoint } = this.transformData(candle);
    this.candleSeries.update(candlePoint);
    this.volumeSeries.update(volumePoint);
  }

  public fitContent() {
    this.chart.timeScale().fitContent();
  }

  public applyTheme(theme: ChartTheme) {
    this.chart.applyOptions({
      layout: {
        background: { type: ColorType.Solid, color: theme.background },
        textColor: theme.textColor,
      },
    });
  }

  public destroy() {
    this.chart.remove();
  }
}
