import { IDomainEvent } from "./IDomainEvent";
import { AggregateRoot } from "../AggregateRoot";
import { UniqueEntityID } from "../UniqueEntityID";

export class DomainEvents {
  // The handlersMap is an Identity map of Domain Event names
  // to callback functions.
  // {
  //   "UserCreated": [Function, Function, Function],
  //   "UserEdited": [Function, Function],
  //   "PostCreated": [Function, Function]
  // }
  private static handlersMap = {};
  private static markedAggregates: AggregateRoot<any>[] = [];

  /**
   * @method markAggregateForDispatch
   * @static
   * @desc Called by aggregate root objects that have created domain
   * events to eventually be dispatched when the infrastructure commits
   * the unit of work.
   */
  public static markAggregateForDispatch(aggregate: AggregateRoot<any>): void {
    const aggregateFound = !!this.findMarkedAggregateByID(aggregate.id);

    if (!aggregateFound) {
      this.markedAggregates.push(aggregate);
    }
  }

  /**
   * @method dispatchAggregateEvents
   * @static
   * @private
   * @desc Call all of the handlers for any domain events on this aggregate.
   */
  private static dispatchAggregateEvents(aggregate: AggregateRoot<any>): void {
    aggregate.domainEvents.forEach((event: IDomainEvent) =>
      this.dispatch(event)
    );
  }

  /**
   * @method removeAggregateFromMarkedDispatchList
   * @static
   * @desc Removes an aggregate from the marked list.
   */
  private static removeAggregateFromMarkedDispatchList(
    aggregate: AggregateRoot<any>
  ): void {
    const index = this.markedAggregates.findIndex((a) => a.equals(aggregate));
    this.markedAggregates.splice(index, 1);
  }

  /**
   * @method removeAggregateFromMarkedDispatchList
   * @static
   * @desc Removes an aggregate from the marked list.
   */
  private static findMarkedAggregateByID(
    id: UniqueEntityID
  ): AggregateRoot<any> {
    let found: AggregateRoot<any> = null;
    for (const aggregate of this.markedAggregates) {
      if (aggregate.id.equals(id)) {
        found = aggregate;
      }
    }

    return found;
  }

  /**
   * @method dispatchEventsForAggregate
   * @static
   * @desc When all we know is the ID of the aggregate, call this
   * in order to dispatch any handlers subscribed to events on the
   * aggregate.
   */
  public static dispatchEventsForAggregate(id: UniqueEntityID): void {
    // Who dictates when a transaction is complete?
    // What should call dispatchEventsForAggregate method?

    // For most simple scenarios,
    // I leave this single responsibility of knowing if the transaction was successful
    // in the ORM being used in the project.

    // The thing is, a lot of these ORMs actually have mechanisms built in
    // to execute code after things get saved to the database.
    // They're usually called hooks.

    // infra/sequelize/hooks/index.ts

    // The benefit of this approach is
    // its ability to keep the infrastructural concerns of a transaction
    // out of the application and domain layers.

    // To be fair, you totally could use Node.js EventEmitter

    const aggregate = this.findMarkedAggregateByID(id);

    if (aggregate) {
      this.dispatchAggregateEvents(aggregate);
      aggregate.clearEvents();
      this.removeAggregateFromMarkedDispatchList(aggregate);
    }
  }

  /**
   * @method register
   * @static
   * @desc Register a handler to a domain event.
   */
  public static register(
    callback: (event: IDomainEvent) => void,
    eventClassName: string
  ): void {
    if (
      !Object.prototype.hasOwnProperty.call(this.handlersMap, eventClassName)
    ) {
      this.handlersMap[eventClassName] = [];
    }
    this.handlersMap[eventClassName].push(callback);
  }

  /**
   * @method clearHandlers
   * @static
   * @desc Useful for testing.
   */
  public static clearHandlers(): void {
    this.handlersMap = {};
  }

  /**
   * @method clearMarkedAggregates
   * @static
   * @desc Useful for testing.
   */
  public static clearMarkedAggregates(): void {
    this.markedAggregates = [];
  }

  /**
   * @method dispatch
   * @static
   * @desc Invokes all of the subscribers to a particular domain event.
   */
  private static dispatch(event: IDomainEvent): void {
    const eventClassName: string = event.constructor.name;

    if (
      Object.prototype.hasOwnProperty.call(this.handlersMap, eventClassName)
    ) {
      const handlers: any[] = this.handlersMap[eventClassName];
      for (const handler of handlers) {
        handler(event);
      }
    }
  }
}
