const { createClient } = require('@supabase/supabase-js');
const {
  addDays,
  subDays,
  subMonths,
  addMonths,
  setHours,
  setMinutes,
  addHours,
  addMinutes,
  format,
} = require('date-fns');
const crypto = require('crypto');

// Profile pictures
const FEMALE_PROFILES = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb',
  'https://images.unsplash.com/photo-1492106087820-71f1a00d2b11',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330',
  'https://images.unsplash.com/photo-1512288094938-363287817259',
  'https://images.unsplash.com/photo-1514626585111-9aa86183ac98',
  'https://images.unsplash.com/photo-1484608856193-968d2be4080e',
  'https://images.unsplash.com/photo-1535207010348-71e47296838a',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80',
  'https://images.pexels.com/photos/29775909/pexels-photo-29775909/free-photo-of-stylish-young-woman-in-casual-denim-and-white-top.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
  'https://images.pexels.com/photos/29829877/pexels-photo-29829877/free-photo-of-young-woman-relaxing-with-coffee-at-cafe.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
  'https://images.pexels.com/photos/29823664/pexels-photo-29823664/free-photo-of-young-woman-in-santa-hat-and-red-dress.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
  'https://images.pexels.com/photos/2115681/pexels-photo-2115681.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
  'https://images.pexels.com/photos/983564/pexels-photo-983564.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
  'https://images.pexels.com/photos/3760745/pexels-photo-3760745.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
  'https://images.pexels.com/photos/1707828/pexels-photo-1707828.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
  'https://images.pexels.com/photos/7394507/pexels-photo-7394507.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
  'https://images.pexels.com/photos/6076063/pexels-photo-6076063.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
  'https://images.pexels.com/photos/18885576/pexels-photo-18885576/free-photo-of-gmy-wear-by-dhanno.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
  'https://images.pexels.com/photos/3438178/pexels-photo-3438178.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
  'https://images.pexels.com/photos/3781789/pexels-photo-3781789.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
];

const MALE_PROFILES = [
  'https://images.unsplash.com/photo-1489980557514-251d61e3eeb6',
  'https://images.unsplash.com/photo-1541577141970-eebc83ebe30e',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d',
  'https://images.unsplash.com/flagged/photo-1595514191830-3e96a518989b',
  'https://images.unsplash.com/photo-1698510047345-ff32de8a3b74',
  'https://images.unsplash.com/photo-1509460913899-515f1df34fea',
  'https://images.pexels.com/photos/29822694/pexels-photo-29822694/free-photo-of-stylish-man-posing-outdoors-in-kaduna.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
  'https://images.pexels.com/photos/29768549/pexels-photo-29768549/free-photo-of-thoughtful-black-and-white-portrait-of-a-man.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
  'https://images.pexels.com/photos/1212984/pexels-photo-1212984.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
  'https://images.pexels.com/photos/5588224/pexels-photo-5588224.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
  'https://images.pexels.com/photos/4816760/pexels-photo-4816760.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
  'https://images.pexels.com/photos/819530/pexels-photo-819530.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
  'https://images.pexels.com/photos/6333501/pexels-photo-6333501.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
  'https://images.pexels.com/photos/4100643/pexels-photo-4100643.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
  'https://images.pexels.com/photos/1680172/pexels-photo-1680172.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
];

// Common Hispanic names
const FIRST_NAMES_MALE = [
  'Andrés',
  'Carlos',
  'Diego',
  'Eduardo',
  'Fernando',
  'Gabriel',
  'Hugo',
  'Ignacio',
  'Javier',
  'Luis',
  'Miguel',
  'Pablo',
  'Rafael',
  'Santiago',
];

const FIRST_NAMES_FEMALE = [
  'Ana',
  'Beatriz',
  'Carolina',
  'Diana',
  'Elena',
  'Gabriela',
  'Isabel',
  'Julia',
  'Laura',
  'María',
  'Natalia',
  'Patricia',
  'Sofía',
  'Valentina',
];

const LAST_NAMES = [
  'García',
  'Rodríguez',
  'López',
  'Martínez',
  'González',
  'Hernández',
  'Pérez',
  'Sánchez',
  'Ramírez',
  'Torres',
  'Flores',
  'Rivera',
  'Morales',
];

// DJ Names for lineup
const DJ_NAMES = [
  'DJ Danny Garcia',
  'Tomas Duque',
  'Ubbah',
  'Nadya',
  'Carl Cox',
  'Alma',
];

// Timeline event templates
const TIMELINE_TEMPLATES = {
  announcements: [
    {
      type: 'announcement',
      category: 'announcement',
      templates: [
        "Doors are open! Welcome to tonight's event 🎉",
        'Tag us in your photos with #ShotMe 📸',
        'Last call for happy hour specials! 🥂',
        "We're at capacity! incredible turnout tonight",
      ],
    },
    {
      type: 'set_time',
      category: 'set_time',
      templates: [
        '{{dj}} taking over the decks 🎧',
        '{{dj}} stepping up to the booth 🎵',
      ],
    },
  ],
  drinks: [
    '2-for-1 on signature cocktails for the next hour! 🍸',
    'VIP bottle service available - ask our staff 🍾',
    'Happy Hour extended until midnight! 🥂',
    'Special guest cocktail menu just dropped 🍹',
  ],
  special: [
    'Surprise guest appearance coming up! 🎵',
    'Photographer in the house! 📸',
    'Special performance in 30 minutes! ⭐️',
  ],
};

const EVENT_IMAGES = [
  'https://res.cloudinary.com/dv0wqwfxo/image/upload/v1734715619/kmyr7fkdkcuhaqnulhjc.jpg',
  'https://res.cloudinary.com/dv0wqwfxo/image/upload/v1734715619/sghvtq6lp5vmkypyjitf.jpg',
  'https://res.cloudinary.com/dv0wqwfxo/image/upload/v1734715619/hldevtrqsokxc68zjeeu.png',
  'https://res.cloudinary.com/dv0wqwfxo/image/upload/v1734715619/ljg8scss2uqwlg100wxe.png',
  'https://res.cloudinary.com/dv0wqwfxo/image/upload/v1734715619/ynnxc5n3llpowxsimx8i.jpg',
  'https://res.cloudinary.com/dv0wqwfxo/image/upload/v1734715618/uwanyhmoy8dq6sv6d1pj.jpg',
  'https://res.cloudinary.com/dv0wqwfxo/image/upload/v1734715619/pv2itepmta1dx4rt8yhg.jpg',
  'https://res.cloudinary.com/dv0wqwfxo/image/upload/v1734715619/pv2itepmta1dx4rt8yhg.jpg',
  'https://res.cloudinary.com/dv0wqwfxo/image/upload/v1734715619/pv2itepmta1dx4rt8yhg.jpg',
];

// Reaction options
const REACTIONS = ['❤️‍🔥', '🙌', '🍻', '👀', '🫡'];

class OptimizedDatabaseSeeder {
  constructor(supabaseUrl, supabaseKey) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.users = [];
    this.events = [];
    this.venues = [];
    this.batchSize = 50; // Reduced batch size for better control
    this.totalUsers = 75; // Balanced number of users
    this.attendeesPerEvent = 40; // Reasonable number of attendees
  }

  generateRandomUser() {
    const isFemale = Math.random() > 0.5;
    const firstName = isFemale
      ? FIRST_NAMES_FEMALE[
          Math.floor(Math.random() * FIRST_NAMES_FEMALE.length)
        ]
      : FIRST_NAMES_MALE[Math.floor(Math.random() * FIRST_NAMES_MALE.length)];
    const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
    const profilePics = isFemale ? FEMALE_PROFILES : MALE_PROFILES;

    return {
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${Math.floor(Math.random() * 999)}@example.com`,
      first_name: firstName,
      last_name: lastName,
      clerk_id: `user_${crypto.randomUUID()}`,
      avatar_url: profilePics[Math.floor(Math.random() * profilePics.length)],
      date_of_birth: format(
        subMonths(new Date(), Math.floor(Math.random() * 240 + 216)),
        'yyyy-MM-dd'
      ),
      phone: `09${Math.floor(Math.random() * 90000000 + 10000000)}`,
      events_attended: 0,
      total_spent: 0,
    };
  }

  async batchInsert(tableName, data) {
    const results = [];
    const totalBatches = Math.ceil(data.length / this.batchSize);

    console.log(
      `Starting batch insert for ${tableName}: ${data.length} records`
    );

    for (let i = 0; i < data.length; i += this.batchSize) {
      const batch = data.slice(i, i + this.batchSize);
      const batchNumber = Math.floor(i / this.batchSize) + 1;

      try {
        const { data: insertedData, error } = await this.supabase
          .from(tableName)
          .insert(batch)
          .select();

        if (error) throw error;

        results.push(...insertedData);
        console.log(
          `Completed batch ${batchNumber}/${totalBatches} for ${tableName}`
        );

        // Small delay between batches to prevent rate limiting
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Error in batch ${batchNumber} for ${tableName}:`, error);
        throw error;
      }
    }

    return results;
  }

  async seedUsers() {
    console.log(`Generating ${this.totalUsers} users...`);

    // Create approved emails first
    const users = Array(this.totalUsers)
      .fill(null)
      .map(() => this.generateRandomUser());

    const emails = users.map((user) => ({ email: user.email }));

    console.log('Creating approved emails...');

    // First, remove any existing duplicate approved emails
    await this.supabase
      .from('approved_emails')
      .delete()
      .in(
        'email',
        emails.map((e) => e.email)
      );

    await this.batchInsert('approved_emails', emails);

    console.log('Creating users...');

    // Filter out users that already exist
    const existingUsers = await this.supabase
      .from('users')
      .select('email')
      .in(
        'email',
        users.map((u) => u.email)
      );

    const existingEmails = new Set(
      existingUsers.data?.map((u) => u.email) || []
    );
    const newUsers = users.filter((user) => !existingEmails.has(user.email));

    this.users = await this.batchInsert('users', newUsers);
    return this.users;
  }

  async seedEvents() {
    const startDate = subMonths(new Date(), 1);
    const endDate = addMonths(new Date(), 1);
    const events = [];

    let currentDate = startDate;
    while (currentDate <= endDate) {
      if ([4, 5, 6].includes(currentDate.getDay())) {
        for (const venue of this.venues) {
          events.push({
            event_name: `${venue.name} ${format(currentDate, 'EEEE')} Night`,
            event_date: setMinutes(setHours(currentDate, 20), 0).toISOString(),
            venue_id: venue.id,
            location: venue.name, // Changed from venue.address to venue.name
            description: 'Join us for a night of music and dancing',
            lineup: this.generateLineup(),
            price_tiers: {
              'Early Bird': 15,
              Regular: 20,
              VIP: 25,
            },
            dress_code: 'Smart Casual',
            image_url:
              EVENT_IMAGES[Math.floor(Math.random() * EVENT_IMAGES.length)],
          });
        }
      }
      currentDate = addDays(currentDate, 1);
    }

    console.log(`Creating ${events.length} events...`);
    this.events = await this.batchInsert('events', events);
    return this.events;
  }

  // Update the createTimelineEvents method to include more varied content
  async createTimelineEvents(event, eventUsers) {
    const eventDate = new Date(event.event_date);
    const timeline = [];

    // Opening announcement
    timeline.push({
      event_id: event.id,
      event_type: 'announcement',
      description: TIMELINE_TEMPLATES.announcements[0].templates[0],
      created_at: eventDate.toISOString(),
      event_category: 'announcement',
    });

    // Generate timeline events throughout the night
    let currentTime = eventDate;

    // DJ set announcements and updates
    event.lineup.forEach((dj, index) => {
      // DJ Start announcement
      const setStartTime = addHours(currentTime, index * 2);
      timeline.push({
        event_id: event.id,
        event_type: 'set_time',
        description: TIMELINE_TEMPLATES.announcements[1].templates[
          Math.floor(
            Math.random() * TIMELINE_TEMPLATES.announcements[1].templates.length
          )
        ].replace('{{dj}}', dj),
        created_at: setStartTime.toISOString(),
        scheduled_for: setStartTime.toISOString(),
        event_category: 'set_time',
      });

      // Mid-set announcements
      // Add a drink special
      const drinkTime = addMinutes(setStartTime, 30);
      timeline.push({
        event_id: event.id,
        event_type: 'announcement',
        description:
          TIMELINE_TEMPLATES.drinks[
            Math.floor(Math.random() * TIMELINE_TEMPLATES.drinks.length)
          ],
        created_at: drinkTime.toISOString(),
        event_category: 'announcement',
      });

      // Add a special announcement
      const specialTime = addHours(setStartTime, 1);
      timeline.push({
        event_id: event.id,
        event_type: 'announcement',
        description:
          TIMELINE_TEMPLATES.special[
            Math.floor(Math.random() * TIMELINE_TEMPLATES.special.length)
          ],
        created_at: specialTime.toISOString(),
        event_category: 'announcement',
      });

      // Regular venue announcement
      const venueTime = addMinutes(specialTime, 30);
      timeline.push({
        event_id: event.id,
        event_type: 'announcement',
        description:
          TIMELINE_TEMPLATES.announcements[0].templates[
            Math.floor(
              Math.random() *
                TIMELINE_TEMPLATES.announcements[0].templates.length
            )
          ],
        created_at: venueTime.toISOString(),
        event_category: 'announcement',
      });
    });

    // Create timeline events
    const timelineEvents = await this.batchInsert('timeline_events', timeline);

    // Generate reactions for each timeline event
    for (const timelineEvent of timelineEvents) {
      // Get random users to react (between 5-15 reactions per event)
      const reactionCount = Math.floor(Math.random() * 11) + 5;
      const reactingUsers = eventUsers
        .sort(() => Math.random() - 0.5)
        .slice(0, reactionCount);

      const reactions = reactingUsers.map((user) => ({
        timeline_event_id: timelineEvent.id,
        user_id: user.id,
        reaction: ['❤️‍🔥', '🙌', '🍻', '👀', '🫡'][Math.floor(Math.random() * 5)],
      }));

      await this.batchInsert('timeline_event_reactions', reactions);
    }

    return timelineEvents;
  }

  generateLineup() {
    return Array(3)
      .fill(null)
      .map(() => DJ_NAMES[Math.floor(Math.random() * DJ_NAMES.length)]);
  }

  async createTicketsAndCheckins(event, users) {
    const eventDate = new Date(event.event_date);
    const isEventPast = eventDate < new Date();

    // Create tickets
    const tickets = users.map((user) => ({
      user_id: user.id,
      event_id: event.id,
      status: 'purchased',
      purchase_date: subDays(
        eventDate,
        Math.floor(Math.random() * 7)
      ).toISOString(),
      ticket_price: event.price_tiers.Regular,
      qr_code: `TICKET-${user.id}-${event.id}-${Date.now()}`,
      used: isEventPast,
    }));

    await this.batchInsert('userevents', tickets);

    // Create check-ins for past events
    if (isEventPast) {
      const checkins = users.map((user) => ({
        user_id: user.id,
        event_id: event.id,
        checked_in_at: addMinutes(
          eventDate,
          Math.floor(Math.random() * 180)
        ).toISOString(),
      }));

      await this.batchInsert('checkins', checkins);
      await this.createTimelineEvents(event, users);
    }
  }

  async createTimelineEvents(event, users) {
    const eventDate = new Date(event.event_date);
    const timeline = [];

    // Opening announcement
    timeline.push({
      event_id: event.id,
      event_type: 'announcement',
      description: "Doors are open! Welcome to tonight's event 🎉",
      created_at: eventDate.toISOString(),
      event_category: 'announcement',
    });

    // Add check-in events for each user
    users.forEach((user, index) => {
      // Spread check-ins over 2 hours
      const checkInTime = addMinutes(eventDate, Math.random() * 120);
      timeline.push({
        event_id: event.id,
        user_id: user.id,
        event_type: 'checkin',
        description: `${user.first_name} ${user.last_name} has arrived!`,
        created_at: checkInTime.toISOString(),
        event_category: 'checkin',
      });
    });

    // Add DJ set announcements
    event.lineup.forEach((dj, index) => {
      const setTime = addHours(eventDate, index * 2);
      timeline.push({
        event_id: event.id,
        event_type: 'set_time',
        description: `${dj} taking over the decks! 🎧`,
        created_at: setTime.toISOString(),
        scheduled_for: setTime.toISOString(),
        event_category: 'set_time',
      });
    });

    // Add some general announcements throughout the night
    const announcements = [
      '🔥 The dance floor is heating up!',
      '📸 Tag us in your photos with #ShotMe',
      '🍾 VIP tables available - ask our staff',
      '🎵 Special guest performance coming up!',
    ];

    announcements.forEach((announcement, index) => {
      timeline.push({
        event_id: event.id,
        event_type: 'announcement',
        description: announcement,
        created_at: addHours(eventDate, 1 + index).toISOString(),
        event_category: 'announcement',
      });
    });

    return this.batchInsert('timeline_events', timeline);
  }

  async init() {
    const { data: venues, error: venueError } = await this.supabase
      .from('venues')
      .select('*');

    if (venueError) throw venueError;
    this.venues = venues;
    console.log(`Found ${venues.length} existing venues`);
  }

  async seedAll() {
    try {
      console.log('Starting database seeding process...');

      await this.init();
      await this.seedUsers();
      await this.seedEvents();

      console.log('Creating tickets and check-ins...');
      for (const event of this.events) {
        const eventUsers = this.users
          .sort(() => Math.random() - 0.5)
          .slice(0, this.attendeesPerEvent);

        await this.createTicketsAndCheckins(event, eventUsers);
        console.log(`Processed event: ${event.event_name}`);
      }

      console.log('Database seeding completed successfully!');
    } catch (error) {
      console.error('Error during seeding:', error);
      throw error;
    }
  }
}

module.exports = OptimizedDatabaseSeeder;
