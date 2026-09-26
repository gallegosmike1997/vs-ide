// ---------------------------------------------------------------------------
// A tiny global bus for "run this app command" requests.
//
// Panels deep in the tree (chat, terminal, rail cards, the editor wrapper) need
// App-level actions - save, ask the AI, open the launcher - without every
// action being threaded through a dozen prop chains. They call fireCmd() and
// App (the single subscriber) dispatches through onMenu().
// ---------------------------------------------------------------------------
import { useEffect } from "react";
import type { MenuAction } from "../store";

export const CMD_EVENT = "vs-ide:cmd";

/** Ask the app to run a command (fires synchronously). */
export function fireCmd(id: MenuAction): void {
  window.dispatchEvent(new CustomEvent<MenuAction>(CMD_EVENT, { detail: id }));
}

/** Subscribe to fireCmd() requests for as long as the component is mounted. */
export function useCmdBus(handler: (id: MenuAction) => void): void {
  useEffect(() => {
    const h = (e: Event) => handler((e as CustomEvent<MenuAction>).detail);
    window.addEventListener(CMD_EVENT, h);
    return () => window.removeEventListener(CMD_EVENT, h);
  }, [handler]);
}
