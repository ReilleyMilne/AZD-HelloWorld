import { RestService } from './restService';
import { TodoItem } from '../models';

export class ItemService extends RestService<TodoItem> {
    public constructor(baseUrl: string, baseRoute: string) {
        super(baseUrl, baseRoute);
    }

    // Override the save method to properly format data for the API
    public async save(entity: TodoItem): Promise<TodoItem> {
        if (entity.id) {
            // For updates, use PUT with the CreateUpdateTodoItem format
            return await this.updateItem(entity);
        } else {
            // For creates, use POST with the CreateUpdateTodoItem format
            return await this.createItem(entity);
        }
    }

    private async createItem(entity: TodoItem): Promise<TodoItem> {
        const createData = {
            name: entity.name,
            state: entity.state,
            dueDate: entity.dueDate,
            completedDate: entity.completedDate,
            description: entity.description
        };

        const response = await this.client.request<TodoItem>({
            method: 'POST',
            data: createData
        });

        return response.data;
    }

    private async updateItem(entity: TodoItem): Promise<TodoItem> {
        const updateData = {
            name: entity.name,
            state: entity.state,
            dueDate: entity.dueDate,
            completedDate: entity.completedDate,
            description: entity.description
        };

        const response = await this.client.request<TodoItem>({
            method: 'PUT',
            url: entity.id,
            data: updateData
        });

        return response.data;
    }
}
