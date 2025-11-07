interface INodeNotifierParams {
  appID: string;
  title: string;
  message: string;
  sound: boolean;
  icon: string;
}

interface INodeNotifier {
  notify(params: INodeNotifierParams): void;
}

declare module "node-notifier" {
    const notifier: INodeNotifier;
    export = notifier;
}

interface IDateFormat {
  (date: Date, format: string): string;
}

declare module "dateformat" {
    const dateformat: IDateFormat;
    export = dateformat;
}