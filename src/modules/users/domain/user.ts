import { UserEmail } from "./userEmail";
import { UserName } from "./userName";
import { UserId } from "./userId";
import { UserCreated } from "./events/userCreated";
import { UserPassword } from "./userPassword";
import { JWTToken, RefreshToken } from "./jwt";
import { UniqueEntityID } from "../../../shared/domain/UniqueEntityID";
import { Result } from "../../../shared/core/Result";
import { Guard } from "../../../shared/core/Guard";
import { AggregateRoot } from "../../../shared/domain/AggregateRoot";

// Part of the job in Domain-Driven Design is protecting against illegal states.
// When we use primitive types like string or number for properties that have fundamental business rules encapsulated with them,
// we're opening ourselves up to the possibility of having an object impossible to the domain.
// So, we are going to use Value Objects.
interface UserProps {
  email: UserEmail; // value object
  username: UserName; // value object
  password: UserPassword; // value object
  isEmailVerified?: boolean;
  isAdminUser?: boolean;
  accessToken?: JWTToken; // value object
  refreshToken?: RefreshToken; // value object
  isDeleted?: boolean;
  lastLogin?: Date;
}

// Domain objects (Aggregates, Entities, and Value Objects)
// hold the highest level of policy in the entirety of our application.
// Upper layer classes rely on it.
// It's on one of these three objects that you want to aim to encapsulate business rules within first.

/**
 * User is an Aggregate Root since it's the
 * object that we perform commands against.
 */
export class User extends AggregateRoot<UserProps> {
  get userId(): UserId {
    return UserId.create(this._id).getValue();
  }

  get email(): UserEmail {
    return this.props.email;
  }

  get username(): UserName {
    return this.props.username;
  }

  get password(): UserPassword {
    return this.props.password;
  }

  /**
   * Private constructor that disables us from
   * circumventing the creation rules by using
   * the `new` keyword.
   */
  private constructor(props: UserProps, id?: UniqueEntityID) {
    super(props, id);
  }

  /**
   * Static factory method that forces the creation of a
   * user by using User.create(props, id?)
   */
  public static create(props: UserProps, id?: UniqueEntityID): Result<User> {
    // To restrict object creation and make sure that it's only possible in the case that we have valid User props,
    // we can implement the Factory Pattern by placing the private keyword on our constructor.
    // This forces everyone to use the static create method if we want to create a User.
    // It also makes it impossible for you to create an invalid User.

    // Guard clause that fails if the required properties aren't provided.
    const guardResult = Guard.againstNullOrUndefinedBulk([
      { argument: props.username, argumentName: "username" },
      { argument: props.email, argumentName: "email" },
    ]);

    if (!guardResult.succeeded) {
      return Result.fail<User>(guardResult.message);
    }

    const isNewUser = !id;
    const user = new User(
      {
        ...props,
        // Assemble default props
        isDeleted: props.isDeleted ? props.isDeleted : false,
        isEmailVerified: props.isEmailVerified ? props.isEmailVerified : false,
        isAdminUser: props.isAdminUser ? props.isAdminUser : false,
      },
      id
    );

    // we want to make sure we fire off the Domain Event to a Subject (see Observer pattern)
    // so that when a transaction (or a Unit of Work) completes,
    // we can propagate that Domain Event cross our enterprise
    // and allow any subdomains or bounded contexts interested in that Event, to do something after having received it.

    // In a monolithic application,
    // we pass messages between subdomains using a class-level implementation of the Observer Pattern.
    // In a micro-service application,
    // we pass messages between Bounded Contexts
    // by using an architecture-level implementation of the Observer Pattern with Message Queues.

    // This is how a Member in the Forum subdomain gets created:
    // in response to the UserCreated domain event from the Users subdomain.
    if (isNewUser) {
      user.addDomainEvent(new UserCreated(user));
    }

    return Result.ok<User>(user);
  }
}
