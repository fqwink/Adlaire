/**
 * Adlaire Framework — WebSocket 接続マネージャー
 * FRAMEWORK_RULEBOOK §6.13 準拠
 */

/**
 * WebSocket 接続をグループとして管理し、ブロードキャスト・個別送信を提供するクラス（§6.13）。
 *
 * ```typescript
 * const room = new WebSocketRoom();
 *
 * export const handler = defineHandler({
 *   GET(ctx) {
 *     const id = crypto.randomUUID();
 *     return ctx.upgradeWebSocket({
 *       onOpen(ws) { room.join(id, ws); room.broadcast({ type: "joined", id }); },
 *       onMessage(_ws, e) { room.broadcast({ from: id, data: e.data }); },
 *       onClose() { room.leave(id); },
 *     });
 *   },
 * });
 * ```
 */
export class WebSocketRoom {
  readonly #connections = new Map<string, WebSocket>();

  /** 登録済み接続数 */
  get count(): number {
    return this.#connections.size;
  }

  /** 指定した ID が登録済みか確認する */
  has(id: string): boolean {
    return this.#connections.has(id);
  }

  /**
   * WebSocket 接続を登録する。
   * 同一 ID で再登録した場合は上書きする。
   */
  join(id: string, ws: WebSocket): void {
    this.#connections.set(id, ws);
  }

  /**
   * WebSocket 接続を削除する。
   * 存在しない ID を指定した場合は無視する。
   */
  leave(id: string): void {
    this.#connections.delete(id);
  }

  /**
   * 特定の接続にメッセージを送信する。
   * `data` が object の場合は JSON.stringify() して送信する。
   * 接続が CLOSED 状態の場合は自動的にスキップしてルームから削除する。
   */
  send(id: string, data: string | object): void {
    const ws = this.#connections.get(id);
    if (!ws) return;
    this.#sendToSocket(id, ws, data);
  }

  /**
   * 全接続にメッセージをブロードキャストする。
   * `excludeId` に指定した接続を除く。
   * CLOSED 状態の接続は自動的にスキップしてルームから削除する。
   */
  broadcast(data: string | object, excludeId?: string): void {
    for (const [id, ws] of this.#connections) {
      if (id === excludeId) continue;
      this.#sendToSocket(id, ws, data);
    }
  }

  /** 内部送信ヘルパー。CLOSED 接続は削除する。 */
  #sendToSocket(id: string, ws: WebSocket, data: string | object): void {
    if (ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING) {
      this.#connections.delete(id);
      return;
    }
    try {
      ws.send(typeof data === "string" ? data : JSON.stringify(data));
    } catch {
      // 送信失敗時はルームから削除
      this.#connections.delete(id);
    }
  }
}
