// Passed to the widgets as props, since the widget bundle can't import the
// app's theme. Filled from the current palette when the app updates them.
export type WidgetColors = {
  background: string;
  text: string;
  muted: string;
  accent: string;
  due: string;
  overdue: string;
};
