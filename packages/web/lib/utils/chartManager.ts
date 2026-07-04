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
      // Automatically uses a ResizeObserver to fit the container
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
        vertLines: { visible: false },
        horzLines: { visible: false },
      },

      // --- PRICE SCALE (Y-Axis) ---
      rightPriceScale: {
        visible: true,
        autoScale: true, // Automatically calculates highest high and lowest low
        ticksVisible: true,
        entireTextOnly: true,
        borderVisible: true,
        scaleMargins: {
          top: 0.1, // Leaves a 10% visual padding at the top
          bottom: 0.1, // Leaves a 10% visual padding at the bottom
        },
      },

      overlayPriceScales: {
        ticksVisible: true,
        borderVisible: true,
      },

      // --- TIME SCALE (X-Axis) ---
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderVisible: true,
        rightOffset: 5, // Leaves a small gap on the right side of the chart
        fixLeftEdge: false,
        fixRightEdge: false,
        // Removed `barSpacing` and `minBarSpacing` to let the engine
        // use its standard native default width (6 pixels) and handle zoom naturally.
      },
    });

    this.candleSeries = this.chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderVisible: false,
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
      priceFormat: {
        type: "price",
        precision: 2,
        minMove: 0.01,
      },
    });

    this.setData(initialData);

    // Initial zoom to fit all data points perfectly on the screen
    this.chart.timeScale().fitContent();
  }

  // Extracted logic to keep data transformations DRY
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

  // Reused the Candle interface here instead of CandleUpdate
  public update(candle: Candle) {
    this.candleSeries.update(this.transformCandle(candle));
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

  public destroy() {
    this.chart.remove();
  }
}
