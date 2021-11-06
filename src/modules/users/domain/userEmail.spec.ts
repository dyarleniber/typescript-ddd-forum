import { UserEmail } from "./userEmail";
import { Result } from "../../../shared/core/Result";

let email: UserEmail | undefined;
let emailOrError: Result<UserEmail>;

test("Should be able to create a valid email", () => {
  emailOrError = UserEmail.create("khalil@apollographql.com");
  expect(emailOrError.isSuccess).toBe(true);
  email = emailOrError.getValue();
  expect(email.value).toBe("khalil@apollographql.com");
});

test("Should fail to create an invalid email", () => {
  emailOrError = UserEmail.create("notvalid");
  expect(emailOrError.isSuccess).toBe(false);
});
