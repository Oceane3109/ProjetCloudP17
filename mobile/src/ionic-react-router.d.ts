declare module "@ionic/react-router" {
  import * as React from "react";

  // Déclarations minimales (compat TS) + children dans JSX
  export interface IonReactRouterProps {
    children?: React.ReactNode;
  }

  export class IonReactRouter extends React.Component<IonReactRouterProps> {}
}

