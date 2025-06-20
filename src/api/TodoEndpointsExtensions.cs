using Microsoft.AspNetCore.Http.HttpResults;

namespace SimpleTodo.Api
{
    public static class TodoEndpointsExtensions
    {
        public static RouteGroupBuilder MapTodoApi(this RouteGroupBuilder group)
        {
            group.MapGet("/", GetLists);
            group.MapPost("/", CreateList);
            group.MapGet("/{listId}", GetList);
            group.MapPut("/{listId}", UpdateList);
            group.MapDelete("/{listId}", DeleteList);
            group.MapGet("/{listId}/items", GetListItems);
            group.MapPost("/{listId}/items", CreateListItem);
            group.MapGet("/{listId}/items/{itemId}", GetListItem);
            group.MapPut("/{listId}/items/{itemId}", UpdateListItem);
            group.MapDelete("/{listId}/items/{itemId}", DeleteListItem);
            group.MapGet("/{listId}/state/{state}", GetListItemsByState);
            return group;
        }

        public static async Task<Ok<IEnumerable<TodoList>>> GetLists(ListsRepository repository, int? skip = null, int? batchSize = null)
        {
            return TypedResults.Ok(await repository.GetListsAsync(skip, batchSize));
        }

        public static async Task<IResult> CreateList(ListsRepository repository, CreateUpdateTodoList list)
        {
            var todoList = new TodoList(list.name)
            {
                Description = list.description
            };

            await repository.AddListAsync(todoList);

            return TypedResults.Created($"/lists/{todoList.Id}", todoList);
        }

        public static async Task<IResult> GetList(ListsRepository repository, string listId)
        {
            var list = await repository.GetListAsync(listId);

            return list == null ? TypedResults.NotFound() : TypedResults.Ok(list);
        }

        public static async Task<IResult> UpdateList(ListsRepository repository, string listId, CreateUpdateTodoList list)
        {
            var existingList = await repository.GetListAsync(listId);
            if (existingList == null)
            {
                return TypedResults.NotFound();
            }

            existingList.Name = list.name;
            existingList.Description = list.description;
            existingList.UpdatedDate = DateTimeOffset.UtcNow;

            await repository.UpdateList(existingList);

            return TypedResults.Ok(existingList);
        }

        public static async Task<IResult> DeleteList(ListsRepository repository, string listId)
        {
            if (await repository.GetListAsync(listId) == null)
            {
                return TypedResults.NotFound();
            }

            await repository.DeleteListAsync(listId);

            return TypedResults.NoContent();
        }

        public static async Task<IResult> GetListItems(ListsRepository repository, string listId, int? skip = null, int? batchSize = null)
        {
            if (await repository.GetListAsync(listId) == null)
            {
                return TypedResults.NotFound();
            }
            return TypedResults.Ok(await repository.GetListItemsAsync(listId, skip, batchSize));
        }

        public static async Task<IResult> CreateListItem(ListsRepository repository, string listId, CreateUpdateTodoItem item)
        {
            if (await repository.GetListAsync(listId) == null)
            {
                return TypedResults.NotFound();
            }

            var newItem = new TodoItem(listId, item.name)
            {
                Name = item.name,
                Description = item.description,
                State = item.state,
                DueDate = item.dueDate,
                CreatedDate = DateTimeOffset.UtcNow
            };

            await repository.AddListItemAsync(newItem);

            return TypedResults.Created($"/lists/{listId}/items{newItem.Id}", newItem);
        }

        public static async Task<IResult> GetListItem(ListsRepository repository, string listId, string itemId)
        {
            if (await repository.GetListAsync(listId) == null)
            {
                return TypedResults.NotFound();
            }

            var item = await repository.GetListItemAsync(listId, itemId);

            return item == null ? TypedResults.NotFound() : TypedResults.Ok(item);
        }

        public static async Task<IResult> UpdateListItem(ListsRepository repository, string listId, string itemId, CreateUpdateTodoItem item)
        {
            var existingItem = await repository.GetListItemAsync(listId, itemId);
            if (existingItem == null)
            {
                return TypedResults.NotFound();
            }

            var oldState = existingItem.State;
            var oldDueDate = existingItem.DueDate;

            existingItem.Name = item.name;
            existingItem.Description = item.description;
            existingItem.DueDate = item.dueDate;
            existingItem.State = item.state;
            existingItem.UpdatedDate = DateTimeOffset.UtcNow;

            // Handle edge case 1: If an item's due date in the done category is changed to a later date, 
            // it should be moved back up to the todo or in progress tab
            // This should only happen when the due date is explicitly being moved to a significantly later time
            if (oldState == "done" && item.state == "done" && 
                item.dueDate.HasValue && oldDueDate.HasValue &&
                item.dueDate.Value != oldDueDate.Value) // Due date was actually changed
            {
                var now = DateTimeOffset.UtcNow;
                var timeDifference = item.dueDate.Value - oldDueDate.Value;
                
                // Only move back to todo if:
                // 1. The new due date is in the future
                // 2. The due date was moved forward by at least 1 hour (to avoid minor adjustments)
                if (item.dueDate.Value > now && timeDifference.TotalHours >= 1)
                {
                    // Move back to todo if due date is significantly extended
                    existingItem.State = "todo";
                    existingItem.CompletedDate = null; // Clear completed date since it's no longer done
                }
            }

            // Handle edge case 2: When an item is changed from in progress to done, ensure state is set to done
            // and handle edge case 3: Always retain due date when marked as complete
            if (item.state == "done" && oldState != "done")
            {
                existingItem.State = "done";
                existingItem.CompletedDate = item.completedDate ?? DateTimeOffset.UtcNow;
                // Due date is preserved - no need to clear it
            }
            else if (item.state != "done")
            {
                // If moving away from done state, clear completed date
                existingItem.CompletedDate = null;
            }
            else
            {
                // For other state changes, update completed date if provided
                existingItem.CompletedDate = item.completedDate;
            }

            await repository.UpdateListItem(existingItem);

            return TypedResults.Ok(existingItem);
        }

        public static async Task<IResult> DeleteListItem(ListsRepository repository, string listId, string itemId)
        {
            if (await repository.GetListItemAsync(listId, itemId) == null)
            {
                return TypedResults.NotFound();
            }

            await repository.DeleteListItemAsync(listId, itemId);

            return TypedResults.NoContent();
        }

        public static async Task<IResult> GetListItemsByState(ListsRepository repository, string listId, string state, int? skip = null, int? batchSize = null)
        {
            if (await repository.GetListAsync(listId) == null)
            {
                return TypedResults.NotFound();
            }

            return TypedResults.Ok(await repository.GetListItemsByStateAsync(listId, state, skip, batchSize));
        }
    }

    public record CreateUpdateTodoList(string name, string? description = null);
    public record CreateUpdateTodoItem(string name, string state, DateTimeOffset? dueDate, DateTimeOffset? completedDate, string? description = null);
}