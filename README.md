# Grand Hotel ERP - Room Management Frontend

This package is the **Member 3: Room Management Module** frontend for the Hotel ERP group assignment.

## Included files

- `index.html` - responsive Room Management page
- `css/style.css` - navy, gold and white theme based on the supplied design
- `js/app.js` - functional frontend logic
- `assets/grand-hotel-logo.jpeg` - original supplied logo
- `assets/grand-hotel-mark.jpg` - compact crop used in the sidebar

## Main features

- Room statistics dashboard
- Search by room number, type, floor, condition or amenities
- Filter by status, room type and floor
- Table and card views
- Add new room
- Edit room
- Delete room
- Quick room status update
- Room condition and nightly rate display
- Responsive mobile sidebar
- Browser `localStorage` for demonstration data

## How to run

1. Extract the ZIP file.
2. Open `index.html` in Chrome, Edge or Firefox.
3. Internet access is required for the Bootstrap and Bootstrap Icons CDN files.

For VS Code, the **Live Server** extension can also be used:
- Right-click `index.html`
- Select **Open with Live Server**

## ASP.NET Core MVC integration

The current version is a frontend prototype. For the group project:

1. Move `css/style.css` into `wwwroot/css/room-management.css`.
2. Move `js/app.js` into `wwwroot/js/room-management.js`.
3. Convert `index.html` into `Views/Rooms/Index.cshtml`.
4. Replace the JavaScript `initialRooms` and `localStorage` section with data from:
   - `RoomController`
   - `Room` model
   - SQL Server or MySQL database
5. Connect the Add, Edit, Delete and Status Update functions to controller actions or API endpoints.

Suggested backend endpoints:

- `GET /Rooms`
- `POST /Rooms/Create`
- `POST /Rooms/Edit/{id}`
- `POST /Rooms/UpdateStatus/{id}`
- `POST /Rooms/Delete/{id}`

## Suggested Room model fields

- `RoomId`
- `RoomNumber`
- `RoomType`
- `Floor`
- `Capacity`
- `RatePerNight`
- `Status`
- `Condition`
- `Amenities`
- `Notes`

## Colour palette

- Dark navy: `#031223`
- Navy: `#061A2E`
- Gold: `#D8A63F`
- Light gold: `#EBC064`
- Page background: `#F3F6FA`
- White: `#FFFFFF`

## Important

The data is currently stored only in the browser for demonstration. Clearing browser storage removes user-added demo records. Use the **Reset Demo Data** button to restore the original sample rooms.
