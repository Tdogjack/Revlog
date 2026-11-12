import { DemoGarageList } from "./garage-list";

export default function DemoGaragePage() {
  return (
    <>
      <h1 className="font-display text-4xl font-semibold">Demo garage</h1>
      <p className="mt-2 max-w-xl text-sm text-steel">
        Three sample cars with a few years of history each. Open one to see its mileage graph,
        service history, build, and reminders.
      </p>
      <DemoGarageList />
    </>
  );
}
