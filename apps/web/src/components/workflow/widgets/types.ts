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

export interface BaseWidgetProps<T extends BaseWidgetConfig> {
  config: T;
  onChange: (value: any) => void;
  className?: string;
  compact?: boolean;
  readonly?: boolean;
}

export interface SliderWidgetProps extends BaseWidgetProps<SliderWidgetConfig> {
  config: SliderWidgetConfig;
}

export interface DatasetSelectorWidgetConfig extends BaseWidgetConfig {
  type: "dataset-selector";
}

export interface DatasetSelectorWidgetProps
  extends BaseWidgetProps<DatasetSelectorWidgetConfig> {
  config: DatasetSelectorWidgetConfig;
}
