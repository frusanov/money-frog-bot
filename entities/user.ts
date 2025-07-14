import { db } from "../config/db";
import { usersTable, type UserSelect } from "../tables/users.sql";
import { BaseEntity, type BaseStatic } from "./_base";

export class User extends BaseEntity implements BaseStatic {
  id: UserSelect["id"];
  tgId: UserSelect["tgId"];

  constructor(data: UserSelect) {
    super();

    this.id = data.id;
    this.tgId = data.tgId;
  }

  async save(): Promise<void> {
    db.up(usersTable).values({
      tgId: this.tgId,
    });
    // await .update(this.id, this);
  }

  static async create(data: UserSelect): Promise<User> {
    const user = new User(data);
    await user.save();
    return user;
  }
}
