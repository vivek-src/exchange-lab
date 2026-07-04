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
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number; // Added volume property
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
        background: {
          type: ColorType.Solid,
          color: theme.background,
        },
        textColor: theme.textColor,
        fontSize: 11,
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      },

      crosshair: {
        mode: CrosshairMode.Normal,
        // Pro Exchange style: clean dashed lines for tracking crosshairs
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

      // Soft grid lines provide context without cluttering up the dark canvas
      grid: {
        vertLines: { color: "#1e222d", style: 1 },
        horzLines: { color: "#1e222d", style: 1 },
      },

      // Primary Y-Axis (Prices)
      rightPriceScale: {
        visible: true,
        autoScale: true,
        entireTextOnly: true,
        borderVisible: true,
        borderColor: "#2a2e39",
        scaleMargins: {
          top: 0.1, // Leaves 10% safety space at the top
          bottom: 0.22, // Leaves 22% room at the bottom so prices stay clear of volume bars
        },
      },

      // --- TIME SCALE (X-Axis) ---
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderVisible: true,
        borderColor: "#2a2e39",
        // Increase rightOffset to leave a comfortable margin on the right side
        rightOffset: 15,
        fixLeftEdge: false, // Ensures we can scroll freely to the left
        fixRightEdge: false,
      },
    });

    // 1. Initialize Candlestick Series
    this.candleSeries = this.chart.addSeries(CandlestickSeries, {
      upColor: "#26a69a", // Pro trading color palettes
      downColor: "#ef5350",
      borderVisible: false,
      wickUpColor: "#26a69a",
      wickDownColor: "#ef5350",
      priceFormat: {
        type: "price",
        precision: 2,
        minMove: 0.01,
      },
    });

    // 2. Initialize Volume Series (Targeting a dedicated independent scale)
    this.volumeSeries = this.chart.addSeries(HistogramSeries, {
      priceScaleId: "volume-pane", // Creates a decoupled custom scale coordinate system
      priceFormat: {
        type: "volume",
      },
    });

    // Constrain volume bars strictly to the bottom 18% of the viewport area
    this.chart.priceScale("volume-pane").applyOptions({
      scaleMargins: {
        top: 0.82,
        bottom: 0,
      },
    });
    // Initialize Volume Series
    this.volumeSeries = this.chart.addSeries(HistogramSeries, {
      priceScaleId: "volume-pane",
      priceFormat: {
        type: "volume",
      },
    });

    // Lift the volume off the very bottom of the screen
    this.chart.priceScale("volume-pane").applyOptions({
      scaleMargins: {
        top: 0.82,
        bottom: 0.05, // Adds a 5% margin at the bottom so volume isn't glued to the dates
      },
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
          : "rgba(239, 83, 80, 0.25)", // Professional alpha translucency
      },
    };
  }

  public setData(data: Candle[]) {
    const candleData: any[] = [];
    const volumeData: any[] = [];

    data.forEach((item) => {
      const { candlePoint, volumePoint } = this.transformData(item);
      candleData.push(candlePoint);
      volumeData.push(volumePoint);
    });

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
