export interface IUser {
    id: string;
    name: string;
    displayName?: string;
}

export class User implements IUser {
    constructor(
        public readonly id: string,
        public readonly name: string,
        public readonly displayName?: string
    ) { }

    public getDisplayName(): string {
        return this.displayName || this.name;
    }

    public static fromDiscordJSUser(user: any): User {
        return new User(
            user.id,
            user.username,
            user.displayName || user.globalName
        );
    }
}
