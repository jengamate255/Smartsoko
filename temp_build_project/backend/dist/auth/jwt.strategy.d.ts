import { Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
declare const JwtStrategy_base: new (...args: any[]) => Strategy;
export declare class JwtStrategy extends JwtStrategy_base {
    private readonly userRepo;
    constructor(userRepo: Repository<User>);
    validate(payload: {
        sub: string;
        email: string;
        role: string;
    }): Promise<User>;
}
export {};
