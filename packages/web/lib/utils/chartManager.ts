import {
  CandlestickSeries,
  AreaSeries,
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

export type SeriesType = "candlestick" | "line";

export interface ChartOptions extends ChartTheme {
  seriesType?: SeriesType;
}

const BRAND_BLUE = "#2563eb"; // matches var(--brand-blue) used for glows/accents elsewhere
const UP_COLOR = "#10b981"; // Tailwind emerald-500 — same "buy"/positive color used app-wide
const DOWN_COLOR = "#ef4444"; // Tailwind red-500 — same "sell"/negative color used app-wide

type PriceSeries = ISeriesApi<"Candlestick", Time> | ISeriesApi<"Area", Time>;

export class ChartManager {
  private chart: IChartApi;
  private priceSeries: PriceSeries;
  private volumeSeries: ISeriesApi<"Histogram", Time>;
  private seriesType: SeriesType;
  private data: Candle[] = [];

  constructor(
    container: HTMLElement,
    initialData: Candle[],
    options: ChartOptions,
  ) {
    this.seriesType = options.seriesType ?? "candlestick";

    this.chart = createChart(container, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: options.background },
        textColor: options.textColor,
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

    this.priceSeries = this.createPriceSeries(this.seriesType);

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

  private createPriceSeries(type: SeriesType): PriceSeries {
    if (type === "line") {
      return this.chart.addSeries(AreaSeries, {
        lineColor: BRAND_BLUE,
        lineWidth: 2,
        topColor: "rgba(37, 99, 235, 0.28)",
        bottomColor: "rgba(37, 99, 235, 0.02)",
        priceFormat: { type: "price", precision: 2, minMove: 0.01 },
      });
    }

    return this.chart.addSeries(CandlestickSeries, {
      upColor: UP_COLOR,
      downColor: DOWN_COLOR,
      borderVisible: true,
      borderUpColor: UP_COLOR,
      borderDownColor: DOWN_COLOR,
      wickUpColor: UP_COLOR,
      wickDownColor: DOWN_COLOR,
      priceFormat: { type: "price", precision: 2, minMove: 0.01 },
    });
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
      linePoint: {
        time,
        value: candle.close,
      },
      volumePoint: {
        time,
        value: candle.volume,
        color: isUpCandle
          ? "rgba(16, 185, 129, 0.25)" // emerald-500 tint, matches UP_COLOR
          : "rgba(239, 68, 68, 0.25)", // red-500 tint, matches DOWN_COLOR
      },
    };
  }

  public setData(data: Candle[]) {
    this.data = data;

    const candleData: any[] = [];
    const lineData: any[] = [];
    const volumeData: any[] = [];

    for (const item of data) {
      const { candlePoint, linePoint, volumePoint } = this.transformData(item);
      candleData.push(candlePoint);
      lineData.push(linePoint);
      volumeData.push(volumePoint);
    }

    this.priceSeries.setData(
      this.seriesType === "line" ? lineData : candleData,
    );
    this.volumeSeries.setData(volumeData);
  }

  public update(candle: Candle) {
    // Keep a running copy so switching series type later has data to redraw with.
    const idx = this.data.findIndex(
      (d) =>
        Math.floor(d.timestamp / 1000) === Math.floor(candle.timestamp / 1000),
    );
    if (idx >= 0) this.data[idx] = candle;
    else this.data.push(candle);

    const { candlePoint, linePoint, volumePoint } = this.transformData(candle);
    this.priceSeries.update(
      this.seriesType === "line" ? linePoint : (candlePoint as any),
    );
    this.volumeSeries.update(volumePoint);
  }

  public setSeriesType(type: SeriesType) {
    if (type === this.seriesType) return;

    this.chart.removeSeries(this.priceSeries as any);
    this.seriesType = type;
    this.priceSeries = this.createPriceSeries(type);
    this.setData(this.data);
  }

  public getSeriesType(): SeriesType {
    return this.seriesType;
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
