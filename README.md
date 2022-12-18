# jwm-server

A JSON web messaging experiment. In early development.


"jwm-server" (first-draft name) hopes to replace some email communications, like newsletters and advertisements (ex, the latest store sales).

## Why?

- Email is spammy AF
- Legit email ends up in spam/junk folders, causing senders and receivers more work.
- Email delivery is unreliable. Which stems from all of the spam, and servers trying to weed it out.
- Email "presentation" is limited. For example, when you look at a list of emails you essentially see a subject, who it's from, and maybe a couple of lines of body text.

## How?

One of our goals is to allow developers to create their own server with whatever tech stack they'd like. There are only a few things to abide by:

1. All servers must implement a handful of API endpoints, so they know how to talk to one another when sending and receiving messages.
2. Since you can pick your own tech stack, each server implementation is likely to need it's own client as well. Of course, it's possible to build a client which works with more than one server implementation if the tech stacks allow this.

## Benefits

- Only receive messages from those you've subscribed to (followed??). aka, no spam! An option of receiving unsolicited messages/emails, in a different folder, will likely need to exist.
- Your message list can also show an avatar of who it's from. Also, being able to associate/attach a header image to the message will display that image in the message list (think of social media feeds that have an image as part of the post). This gives content creators better ways of grabbing your attention, and receivers a richer experience.
- Use whatever jwm-server service, and client, you like. Note: when switching providers, your domain name will change; and you aren't guaranteed the same user.
- Usernames will be in email format (ex, sly@example.com). This is to allow integration with existing email systems. In other words, a user can signup for tradtional email newsletters and receive those through their jwm-client. This, of course, requires the feature to be implemented as part of the server.
