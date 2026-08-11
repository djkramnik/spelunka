export type InputRoute<Receiver> = (receiver: Receiver) => void;

export default class InputRouter<Receiver> {
    private readonly receivers = new Set<Receiver>();

    addReceiver(receiver: Receiver): void {
        this.receivers.add(receiver);
    }

    dropReceiver(receiver: Receiver): void {
        this.receivers.delete(receiver);
    }

    route(routeInput: InputRoute<Receiver>): void {
        for (const receiver of this.receivers) {
            routeInput(receiver);
        }
    }
}
