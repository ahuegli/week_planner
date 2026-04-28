import { Repository } from 'typeorm';
import { User } from './user.entity';
export declare class UserService {
    private readonly userRepository;
    constructor(userRepository: Repository<User>);
    findByEmail(email: string): Promise<User | null>;
    findById(id: string): Promise<User | null>;
    findByIds(ids: string[]): Promise<User[]>;
    create(email: string, hashedPassword: string, name?: string): Promise<User>;
}
