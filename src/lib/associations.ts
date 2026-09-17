import Business from "@/modules/business/business.model";
import User from "@/modules/business/user.model";
import Professional from "@/modules/business/professional.model";
import BusinessHours from "@/modules/business/business-hours.model";
import Service from "@/modules/catalog/service.model";
import ServiceSegment from "@/modules/catalog/service-segment.model";
import Client from "@/modules/clients/client.model";
import Appointment from "@/modules/agenda/appointment.model";
import "@/modules/notifications/notification-associations";

Business.hasMany(User, { foreignKey: "business_id", as: "users" });
User.belongsTo(Business, { foreignKey: "business_id", as: "business" });

Business.hasMany(Professional, { foreignKey: "business_id", as: "professionals" });
Professional.belongsTo(Business, { foreignKey: "business_id", as: "business" });

Business.hasMany(BusinessHours, { foreignKey: "business_id", as: "hours" });
BusinessHours.belongsTo(Business, { foreignKey: "business_id", as: "business" });

Business.hasMany(Service, { foreignKey: "business_id", as: "services" });
Service.belongsTo(Business, { foreignKey: "business_id", as: "business" });

Service.hasMany(ServiceSegment, { foreignKey: "service_id", as: "segments" });
ServiceSegment.belongsTo(Service, { foreignKey: "service_id", as: "service" });

Business.hasMany(Client, { foreignKey: "business_id", as: "clients" });
Client.belongsTo(Business, { foreignKey: "business_id", as: "business" });

Business.hasMany(Appointment, { foreignKey: "business_id", as: "appointments" });
Appointment.belongsTo(Business, { foreignKey: "business_id", as: "business" });
Appointment.belongsTo(Professional, { foreignKey: "professional_id", as: "professional" });
Appointment.belongsTo(Client, { foreignKey: "client_id", as: "client" });
Appointment.belongsTo(Service, { foreignKey: "service_id", as: "service" });

export { Business, User, Professional, BusinessHours, Service, ServiceSegment, Client, Appointment };
