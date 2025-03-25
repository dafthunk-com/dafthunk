export interface BaseWidgetConfig {
  type: string;
  id: string;
  name: string;
  value?: any;
}

export interface SliderWidgetConfig extends BaseWidgetConfig {
  type: "slider";
  min: number;
  max: number;
  step: number;
}

export type WidgetConfig = SliderWidgetConfig; // Add more widget types here as needed

export interface BaseWidgetProps<T extends BaseWidgetConfig> {
  config: T;
  onChange: (value: any) => void;
  className?: string;
  compact?: boolean;
}

export interface SliderWidgetProps extends BaseWidgetProps<SliderWidgetConfig> {
  config: SliderWidgetConfig;
}
