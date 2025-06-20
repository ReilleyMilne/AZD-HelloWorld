import { Text, DatePicker, Stack, TextField, PrimaryButton, DefaultButton, Dropdown, IDropdownOption, FontIcon } from '@fluentui/react';
import { useEffect, useState, FC, ReactElement, MouseEvent, FormEvent } from 'react';
import { TodoItem, TodoItemState } from '../models';
import { stackGaps, stackItemMargin, stackItemPadding, titleStackStyles } from '../ux/styles';
import { locationService } from '../services/locationService';

interface TodoItemDetailPaneProps {
    item?: TodoItem;
    onEdit: (item: TodoItem) => void
    onCancel: () => void
}

export const TodoItemDetailPane: FC<TodoItemDetailPaneProps> = (props: TodoItemDetailPaneProps): ReactElement => {
    const [name, setName] = useState(props.item?.name || '');
    const [description, setDescription] = useState(props.item?.description);
    const [dueDate, setDueDate] = useState(props.item?.dueDate);
    const [dueTime, setDueTime] = useState('');
    const [state, setState] = useState(props.item?.state || TodoItemState.Todo);
    const [currentTimezone, setCurrentTimezone] = useState('');

    useEffect(() => {
        // Get current timezone
        setCurrentTimezone(locationService.getCurrentTimezone());
    }, []);

    useEffect(() => {
        setName(props.item?.name || '');
        setDescription(props.item?.description);
        
        if (props.item?.dueDate) {
            const date = new Date(props.item.dueDate);
            setDueDate(date);
            // Extract time in HH:MM format
            const hours = date.getHours().toString().padStart(2, '0');
            const minutes = date.getMinutes().toString().padStart(2, '0');
            setDueTime(`${hours}:${minutes}`);
        } else {
            setDueDate(undefined);
            setDueTime('');
        }
        
        setState(props.item?.state || TodoItemState.Todo);
    }, [props.item]);

    const saveTodoItem = (evt: MouseEvent<HTMLButtonElement>) => {
        evt.preventDefault();

        if (!props.item?.id) {
            return;
        }

        // Combine date and time if both are provided
        let combinedDueDate = dueDate;
        if (dueDate && dueTime) {
            const dateOnly = new Date(dueDate);
            const [hours, minutes] = dueTime.split(':');
            dateOnly.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
            
            // Use user's timezone for accurate date storage
            const userTimezone = locationService.getCurrentTimezone();
            // Store the date as it would appear in the user's timezone
            combinedDueDate = new Date(dateOnly.toLocaleString('en-US', { timeZone: userTimezone }));
        }

        const todoItem: TodoItem = {
            id: props.item.id,
            listId: props.item.listId,
            name: name,
            description: description,
            dueDate: combinedDueDate,
            state: state,
            // Preserve completedDate if item was already completed, or set it if newly completed
            completedDate: state === TodoItemState.Done ? (props.item.completedDate || new Date()) : undefined,
            // Preserve other dates
            createdDate: props.item.createdDate,
            updatedDate: new Date(),
        };

        props.onEdit(todoItem);
    };

    const cancelEdit = () => {
        props.onCancel();
    }

    const onStateChange = (_evt: FormEvent<HTMLDivElement>, value?: IDropdownOption) => {
        if (value) {
            setState(value.key as TodoItemState);
        }
    }

    const onDueDateChange = (date: Date | null | undefined) => {
        setDueDate(date || undefined);
    }

    const onDueTimeChange = (_evt: FormEvent<HTMLInputElement | HTMLTextAreaElement>, value?: string) => {
        setDueTime(value || '');
    }

    const todoStateOptions: IDropdownOption[] = [
        { key: TodoItemState.Todo, text: 'To Do' },
        { key: TodoItemState.InProgress, text: 'In Progress' },
        { key: TodoItemState.Done, text: 'Done' },
    ];

    return (
        <Stack>
            {props.item &&
                <>
                    <Stack.Item styles={titleStackStyles} tokens={stackItemPadding}>
                        <Text block variant="xLarge">{name}</Text>
                        <Text variant="small">{description}</Text>
                    </Stack.Item>
                    <Stack.Item tokens={stackItemMargin}>
                        <TextField label="Name" placeholder="Item name" required value={name} onChange={(_e, value) => setName(value || '')} />
                        <TextField label="Description" placeholder="Item description" multiline size={20} value={description || ''} onChange={(_e, value) => setDescription(value)} />
                        <Dropdown label="State" options={todoStateOptions} required selectedKey={state} onChange={onStateChange} />
                        <DatePicker label="Due Date" placeholder="Due date" value={dueDate} onSelectDate={onDueDateChange} />
                        <TextField 
                            label="Due Time" 
                            placeholder="Select time" 
                            type="time"
                            value={dueTime} 
                            onChange={onDueTimeChange} 
                        />
                        {currentTimezone && (
                            <Text variant="small" style={{ color: '#666', fontStyle: 'italic', marginTop: '5px' }}>
                                <FontIcon iconName="World" style={{ marginRight: '5px' }} />
                                Timezone: {currentTimezone}
                            </Text>
                        )}
                    </Stack.Item>
                    <Stack.Item tokens={stackItemMargin}>
                        <Stack horizontal tokens={stackGaps}>
                            <PrimaryButton text="Save" onClick={saveTodoItem} />
                            <DefaultButton text="Cancel" onClick={cancelEdit} />
                        </Stack>
                    </Stack.Item>
                </>
            }
            {!props.item &&
                <Stack.Item tokens={stackItemPadding} style={{ textAlign: "center" }} align="center">
                    <FontIcon iconName="WorkItem" style={{ fontSize: 24, padding: 20 }} />
                    <Text block>Select an item to edit</Text>
                </Stack.Item>}
        </Stack >
    );
}

export default TodoItemDetailPane;